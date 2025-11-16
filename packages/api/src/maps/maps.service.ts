import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { Map } from './map.entity';
import { Field } from '../fields/field.entity';
import { CreateMapDto } from './dto/create-map.dto';
import { QueryMapsDto } from './dto/query-maps.dto';
import * as AWS from 'aws-sdk';

/**
 * Maps service.
 * Orchestrates soil property map generation via ML inference.
 * Referenced in ADR-006 (AWS Lambda inference) and ADR-007 (TiTiler).
 */
@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly s3: AWS.S3;
  private readonly lambda: AWS.Lambda;
  private readonly titilerBaseUrl: string;

  constructor(
    @InjectRepository(Map)
    private mapsRepository: Repository<Map>,
    @InjectRepository(Field)
    private fieldsRepository: Repository<Field>,
    @InjectQueue('map-generation')
    private mapGenerationQueue: Queue,
    private configService: ConfigService,
  ) {
    this.s3 = new AWS.S3({
      region: this.configService.get('AWS_REGION'),
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    });

    this.lambda = new AWS.Lambda({
      region: this.configService.get('AWS_REGION'),
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
    });

    this.titilerBaseUrl = this.configService.get('TITILER_BASE_URL', 'https://titiler.soilviews.bg');
  }

  /**
   * Create a new map generation request.
   * Enqueues job for background processing.
   */
  async create(createMapDto: CreateMapDto, organizationId: string): Promise<Map> {
    // Validate field exists and belongs to organization
    const field = await this.fieldsRepository.findOne({
      where: { id: createMapDto.fieldId, organizationId },
    });

    if (!field) {
      throw new NotFoundException('Field not found');
    }

    // Check if map already exists for this field/property/year
    const existingMap = await this.mapsRepository.findOne({
      where: {
        fieldId: createMapDto.fieldId,
        property: createMapDto.property,
        cropYear: createMapDto.cropYear,
        status: 'COMPLETED',
      },
    });

    if (existingMap) {
      this.logger.log(`Map already exists for field ${field.id}, property ${createMapDto.property}`);
      return existingMap;
    }

    // Create map record with PENDING status
    const map = this.mapsRepository.create({
      organizationId,
      fieldId: createMapDto.fieldId,
      property: createMapDto.property,
      cropYear: createMapDto.cropYear,
      resolutionMeters: createMapDto.resolutionMeters || 10,
      status: 'PENDING',
      generatedAt: new Date(),
      statistics: { min: 0, max: 0, mean: 0, stdDev: 0 },
      modelMetadata: {
        encoder: 'efficientnet-b3',
        decoder: 'deeplabv3plus',
        version: 'v1.0.0',
      },
      inputData: {
        sentinel2Dates: [],
        cloudCover: createMapDto.maxCloudCover || 20,
        compositeMethod: 'bare-soil',
      },
      cogUrl: '',
    });

    const savedMap = await this.mapsRepository.save(map);

    // Enqueue background job for map generation
    await this.mapGenerationQueue.add('generate-map', {
      mapId: savedMap.id,
      fieldId: field.id,
      property: createMapDto.property,
      cropYear: createMapDto.cropYear,
      startDate: createMapDto.startDate || `${createMapDto.cropYear}-03-15`,
      endDate: createMapDto.endDate || `${createMapDto.cropYear}-04-30`,
      maxCloudCover: createMapDto.maxCloudCover || 20,
      resolutionMeters: createMapDto.resolutionMeters || 10,
      fieldGeometry: field.geometry,
    });

    this.logger.log(`Enqueued map generation job for map ${savedMap.id}`);

    return savedMap;
  }

  /**
   * Find all maps with optional filters.
   */
  async findAll(queryDto: QueryMapsDto, organizationId: string): Promise<{ maps: Map[]; total: number }> {
    const where: FindOptionsWhere<Map> = { organizationId };

    if (queryDto.fieldId) {
      where.fieldId = queryDto.fieldId;
    }
    if (queryDto.property) {
      where.property = queryDto.property;
    }
    if (queryDto.cropYear) {
      where.cropYear = queryDto.cropYear;
    }
    if (queryDto.status) {
      where.status = queryDto.status;
    }

    const [maps, total] = await this.mapsRepository.findAndCount({
      where,
      relations: ['field'],
      order: { generatedAt: 'DESC' },
      take: queryDto.limit || 10,
      skip: queryDto.offset || 0,
    });

    return { maps, total };
  }

  /**
   * Find one map by ID.
   */
  async findOne(id: string, organizationId: string): Promise<Map> {
    const map = await this.mapsRepository.findOne({
      where: { id, organizationId },
      relations: ['field'],
    });

    if (!map) {
      throw new NotFoundException('Map not found');
    }

    return map;
  }

  /**
   * Invoke AWS Lambda for ML inference.
   * Called by the background job processor.
   */
  async invokeLambdaInference(
    mapId: string,
    sentinel2CogUrl: string,
    sentinel1CogUrl: string,
    property: string,
  ): Promise<{ cogUrl: string; statistics: any }> {
    const startTime = Date.now();

    const payload = {
      sentinel2_url: sentinel2CogUrl,
      sentinel1_url: sentinel1CogUrl,
      property,
      output_bucket: this.configService.get('S3_MAPS_BUCKET'),
      output_key: `maps/${mapId}/${property}.tif`,
    };

    this.logger.log(`Invoking Lambda for map ${mapId}, property ${property}`);

    try {
      const response = await this.lambda
        .invoke({
          FunctionName: this.configService.get('LAMBDA_INFERENCE_FUNCTION'),
          InvocationType: 'RequestResponse',
          Payload: JSON.stringify(payload),
        })
        .promise();

      const result = JSON.parse(response.Payload as string);

      if (result.errorMessage) {
        throw new Error(result.errorMessage);
      }

      const processingTime = (Date.now() - startTime) / 1000;

      this.logger.log(`Lambda inference completed in ${processingTime}s for map ${mapId}`);

      return {
        cogUrl: result.cog_url,
        statistics: result.statistics,
      };
    } catch (error) {
      this.logger.error(`Lambda inference failed for map ${mapId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update map status and metadata after processing.
   */
  async updateMapStatus(
    mapId: string,
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED',
    updates: Partial<Map> = {},
  ): Promise<Map> {
    const map = await this.mapsRepository.findOne({ where: { id: mapId } });

    if (!map) {
      throw new NotFoundException('Map not found');
    }

    Object.assign(map, updates, { status });

    // Generate TiTiler URL if COG URL is available
    if (status === 'COMPLETED' && map.cogUrl) {
      map.tileUrl = this.generateTiTilerUrl(map.cogUrl, map.property);
    }

    return this.mapsRepository.save(map);
  }

  /**
   * Generate TiTiler tile URL for COG visualization.
   * Referenced in ADR-007.
   */
  private generateTiTilerUrl(cogUrl: string, property: string): string {
    const colormap = this.getColormapForProperty(property);
    const encodedUrl = encodeURIComponent(cogUrl);

    return `${this.titilerBaseUrl}/cog/tiles/{z}/{x}/{y}?url=${encodedUrl}&colormap_name=${colormap}&rescale=auto`;
  }

  /**
   * Get appropriate colormap for soil property visualization.
   */
  private getColormapForProperty(property: string): string {
    const colormapMapping: Record<string, string> = {
      ph: 'RdYlGn', // Red (acidic) to Green (alkaline)
      organic_matter: 'YlOrBr', // Yellow to Brown
      nitrogen: 'Greens',
      phosphorus: 'Purples',
      potassium: 'Blues',
      clay_percent: 'copper',
      sand_percent: 'YlOrRd',
    };

    return colormapMapping[property] || 'viridis';
  }

  /**
   * Delete a map.
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const map = await this.findOne(id, organizationId);

    // Delete COG from S3
    if (map.cogUrl && map.cogUrl.startsWith('s3://')) {
      const s3Url = map.cogUrl.replace('s3://', '');
      const [bucket, ...keyParts] = s3Url.split('/');
      const key = keyParts.join('/');

      try {
        await this.s3.deleteObject({ Bucket: bucket, Key: key }).promise();
        this.logger.log(`Deleted COG from S3: ${map.cogUrl}`);
      } catch (error) {
        this.logger.warn(`Failed to delete COG from S3: ${error.message}`);
      }
    }

    await this.mapsRepository.remove(map);
  }

  /**
   * Get map statistics for a field.
   */
  async getFieldStatistics(fieldId: string, organizationId: string): Promise<any> {
    const maps = await this.mapsRepository.find({
      where: { fieldId, organizationId, status: 'COMPLETED' },
      order: { generatedAt: 'DESC' },
    });

    const statistics = maps.reduce((acc, map) => {
      acc[map.property] = {
        ...map.statistics,
        generatedAt: map.generatedAt,
        cropYear: map.cropYear,
      };
      return acc;
    }, {});

    return statistics;
  }
}
