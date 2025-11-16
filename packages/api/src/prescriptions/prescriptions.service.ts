import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Prescription } from './prescription.entity';
import { Field } from '../fields/field.entity';
import { Map } from '../maps/map.entity';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import * as AWS from 'aws-sdk';

/**
 * Prescriptions service.
 * Generates Variable Rate Application (VRA) prescriptions for fertilizers.
 * Crop-specific algorithms for wheat, sunflower, and maize.
 */
@Injectable()
export class PrescriptionsService {
  private readonly logger = new Logger(PrescriptionsService.name);
  private readonly s3: AWS.S3;

  constructor(
    @InjectRepository(Prescription)
    private prescriptionsRepository: Repository<Prescription>,
    @InjectRepository(Field)
    private fieldsRepository: Repository<Field>,
    @InjectRepository(Map)
    private mapsRepository: Repository<Map>,
    @InjectQueue('prescription-generation')
    private prescriptionQueue: Queue,
    private configService: ConfigService,
  ) {
    this.s3 = new AWS.S3({
      region: this.configService.get('AWS_REGION'),
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    });
  }

  /**
   * Create a new VRA prescription.
   * Enqueues background job for generation.
   */
  async create(createDto: CreatePrescriptionDto, organizationId: string): Promise<Prescription> {
    // Validate field exists
    const field = await this.fieldsRepository.findOne({
      where: { id: createDto.fieldId, organizationId },
    });

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    // Find latest soil property maps for the field
    const nMap = await this.mapsRepository.findOne({
      where: { fieldId: createDto.fieldId, property: 'nitrogen', status: 'COMPLETED' },
      order: { generatedAt: 'DESC' },
    });

    const pMap = await this.mapsRepository.findOne({
      where: { fieldId: createDto.fieldId, property: 'phosphorus', status: 'COMPLETED' },
      order: { generatedAt: 'DESC' },
    });

    const kMap = await this.mapsRepository.findOne({
      where: { fieldId: createDto.fieldId, property: 'potassium', status: 'COMPLETED' },
      order: { generatedAt: 'DESC' },
    });

    if (!nMap || !pMap || !kMap) {
      throw new BadRequestException(
        'Missing required soil property maps. Please generate N, P, and K maps first.',
      );
    }

    // Create prescription record
    const prescription = this.prescriptionsRepository.create({
      organizationId,
      fieldId: createDto.fieldId,
      cropType: createDto.cropType,
      season: createDto.season,
      strategy: createDto.strategy || 'VARIABLE',
      targetRates: createDto.targetRates,
      sourceMapIds: [nMap.id, pMap.id, kMap.id],
      parameters: {
        yieldGoal: createDto.yieldGoal,
        method: createDto.method || 'nutrient_removal',
        efficiency: createDto.efficiency || 0.7,
      },
      status: 'PENDING',
      generatedAt: new Date(),
      statistics: { totalN: 0, totalP: 0, totalK: 0, averageRate: 0 },
      shapefileUrl: '',
    });

    const saved = await this.prescriptionsRepository.save(prescription);

    // Enqueue background job
    await this.prescriptionQueue.add('generate-prescription', {
      prescriptionId: saved.id,
      fieldId: field.id,
      cropType: createDto.cropType,
      nMapId: nMap.id,
      pMapId: pMap.id,
      kMapId: kMap.id,
      targetRates: createDto.targetRates,
      parameters: prescription.parameters,
      strategy: prescription.strategy,
    });

    this.logger.log(`Enqueued prescription generation for ${saved.id}`);

    return saved;
  }

  /**
   * Find all prescriptions with filters.
   */
  async findAll(organizationId: string, fieldId?: string): Promise<Prescription[]> {
    const where: any = { organizationId };
    if (fieldId) {
      where.fieldId = fieldId;
    }

    return this.prescriptionsRepository.find({
      where,
      relations: ['field'],
      order: { generatedAt: 'DESC' },
    });
  }

  /**
   * Find one prescription by ID.
   */
  async findOne(id: string, organizationId: string): Promise<Prescription> {
    const prescription = await this.prescriptionsRepository.findOne({
      where: { id, organizationId },
      relations: ['field'],
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  /**
   * Update prescription status and metadata.
   */
  async updateStatus(
    prescriptionId: string,
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED',
    updates: Partial<Prescription> = {},
  ): Promise<Prescription> {
    const prescription = await this.prescriptionsRepository.findOne({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    Object.assign(prescription, updates, { status });

    return this.prescriptionsRepository.save(prescription);
  }

  /**
   * Calculate nutrient removal rates for crops.
   * Based on Bulgarian agronomic research.
   */
  calculateNutrientRemoval(cropType: string, yieldGoal: number): { n: number; p: number; k: number } {
    // Nutrient removal coefficients (kg nutrient / ton grain)
    const coefficients: Record<string, { n: number; p: number; k: number }> = {
      wheat: {
        n: 25, // 25 kg N per ton grain
        p: 12, // 12 kg P2O5 per ton grain
        k: 22, // 22 kg K2O per ton grain
      },
      sunflower: {
        n: 50, // High N demand
        p: 20,
        k: 150, // Very high K demand
      },
      maize: {
        n: 22,
        p: 10,
        k: 24,
      },
    };

    const coef = coefficients[cropType] || coefficients.wheat;

    return {
      n: coef.n * yieldGoal,
      p: coef.p * yieldGoal,
      k: coef.k * yieldGoal,
    };
  }

  /**
   * Calculate site-specific application rates based on soil test and crop requirements.
   */
  calculateApplicationRate(
    soilTest: number, // mg/kg
    cropRequirement: number, // kg/ha
    efficiency: number, // 0-1
    nutrient: 'n' | 'p' | 'k',
  ): number {
    // Convert soil test (mg/kg) to soil supply (kg/ha)
    // Assumption: 20cm depth, bulk density 1.3 g/cm³
    const depthCm = 20;
    const bulkDensity = 1.3; // g/cm³
    const soilMass = 10000 * depthCm * bulkDensity * 10; // kg/ha
    const soilSupply = (soilTest * soilMass) / 1000000; // kg/ha

    // Application rate = (crop requirement - soil supply) / efficiency
    let applicationRate = (cropRequirement - soilSupply) / efficiency;

    // Apply nutrient-specific adjustments
    if (nutrient === 'p') {
      // Phosphorus fixation in calcareous soils (Bulgaria)
      applicationRate *= 1.2;
    }

    if (nutrient === 'k') {
      // Potassium luxury consumption for sunflower
      applicationRate *= 1.1;
    }

    // Ensure non-negative
    return Math.max(0, Math.round(applicationRate));
  }

  /**
   * Delete a prescription.
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const prescription = await this.findOne(id, organizationId);

    // Delete shapefile from S3
    if (prescription.shapefileUrl && prescription.shapefileUrl.startsWith('s3://')) {
      try {
        const s3Url = prescription.shapefileUrl.replace('s3://', '');
        const [bucket, ...keyParts] = s3Url.split('/');
        const baseKey = keyParts.join('/').replace('.shp', '');

        // Delete all shapefile components (.shp, .dbf, .shx, .prj)
        const extensions = ['.shp', '.dbf', '.shx', '.prj', '.cpg'];
        await Promise.all(
          extensions.map(ext =>
            this.s3
              .deleteObject({ Bucket: bucket, Key: `${baseKey}${ext}` })
              .promise()
              .catch(() => {}),
          ),
        );

        this.logger.log(`Deleted shapefile from S3: ${prescription.shapefileUrl}`);
      } catch (error) {
        this.logger.warn(`Failed to delete shapefile: ${error.message}`);
      }
    }

    await this.prescriptionsRepository.remove(prescription);
  }

  /**
   * Generate shapefile download URL with presigned S3 URL.
   */
  async getDownloadUrl(id: string, organizationId: string): Promise<string> {
    const prescription = await this.findOne(id, organizationId);

    if (!prescription.shapefileUrl || !prescription.shapefileUrl.startsWith('s3://')) {
      throw new BadRequestException('Shapefile not available');
    }

    const s3Url = prescription.shapefileUrl.replace('s3://', '');
    const [bucket, ...keyParts] = s3Url.split('/');
    const key = keyParts.join('/');

    const url = this.s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: 3600, // 1 hour
    });

    return url;
  }
}
