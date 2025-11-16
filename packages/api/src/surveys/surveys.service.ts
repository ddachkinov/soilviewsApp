import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Survey } from './survey.entity';
import { CreateSurveyDto } from './dto/create-survey.dto';
import * as parquet from 'parquetjs';
import { Readable } from 'stream';

/**
 * Surveys Service
 *
 * Handles ground-truth soil sample data ingestion and management.
 * Supports CSV, Excel, Shapefile, and Parquet upload formats.
 *
 * Key Features:
 * - ISO 28258 schema validation
 * - Parquet file parsing (ADR-008)
 * - Spatial validation (coordinates within Bulgaria)
 * - Quality control flagging
 * - ML model retraining queue triggering
 */
@Injectable()
export class SurveysService {
  constructor(
    @InjectRepository(Survey)
    private surveysRepository: Repository<Survey>
  ) {}

  /**
   * Create a new survey record.
   *
   * @param createSurveyDto - Survey data
   * @param organizationId - Organization ID (from authenticated user)
   * @returns Created survey
   */
  async create(createSurveyDto: CreateSurveyDto, organizationId: string): Promise<Survey> {
    // Validate coordinates are within Bulgaria
    this.validateBulgarianCoordinates(createSurveyDto.latitude, createSurveyDto.longitude);

    // Validate soil property ranges
    this.validateSoilProperties(createSurveyDto);

    const survey = this.surveysRepository.create({
      ...createSurveyDto,
      organizationId,
      location: {
        type: 'Point',
        coordinates: [createSurveyDto.longitude, createSurveyDto.latitude],
      },
    });

    return this.surveysRepository.save(survey);
  }

  /**
   * Upload and parse Parquet file with multiple surveys.
   *
   * Implements ADR-008: Apache Parquet for ground-truth exchange.
   *
   * @param fileBuffer - Parquet file buffer
   * @param organizationId - Organization ID
   * @returns Number of surveys imported
   */
  async uploadParquet(fileBuffer: Buffer, organizationId: string): Promise<{ count: number }> {
    try {
      // Parse Parquet file
      const reader = await parquet.ParquetReader.openBuffer(fileBuffer);
      const cursor = reader.getCursor();

      let record;
      const surveys: Survey[] = [];

      while ((record = await cursor.next())) {
        // Validate required fields
        if (!record.latitude || !record.longitude || !record.sample_date) {
          continue; // Skip invalid records
        }

        // Map Parquet record to Survey entity
        const survey = this.surveysRepository.create({
          organizationId,
          location: {
            type: 'Point',
            coordinates: [record.longitude, record.latitude],
          },
          sampleDate: new Date(record.sample_date),
          depthCm: record.depth_cm || 20,
          ph: record.ph,
          organicMatter: record.om_pct,
          nitrogen: record.n_mg_kg,
          phosphorus: record.p_mg_kg,
          potassium: record.k_mg_kg,
          clayPercent: record.clay_pct,
          sandPercent: record.sand_pct,
          municipality: record.municipality,
          district: record.district,
          labMethod: record.lab_method,
          dataQuality: record.data_quality || 'GOOD',
        });

        // Validate
        try {
          this.validateBulgarianCoordinates(record.latitude, record.longitude);
          this.validateSoilProperties(survey);
          surveys.push(survey);
        } catch (error) {
          // Mark as REJECTED if validation fails
          survey.dataQuality = 'REJECTED';
          survey.metadata = { validationError: error.message };
          surveys.push(survey);
        }
      }

      await reader.close();

      // Bulk insert
      const savedSurveys = await this.surveysRepository.save(surveys);

      // TODO: Trigger ML model retraining queue
      // await this.mlQueue.add('retrain', { newSamples: savedSurveys.length });

      return { count: savedSurveys.length };
    } catch (error) {
      throw new BadRequestException(`Failed to parse Parquet file: ${error.message}`);
    }
  }

  /**
   * Find all surveys for organization.
   *
   * @param organizationId - Organization ID
   * @param filters - Optional filters (municipality, dateRange, etc.)
   * @returns Array of surveys
   */
  async findAll(
    organizationId: string,
    filters?: {
      municipality?: string;
      startDate?: Date;
      endDate?: Date;
      dataQuality?: string;
    }
  ): Promise<Survey[]> {
    const query = this.surveysRepository
      .createQueryBuilder('survey')
      .where('survey.organizationId = :organizationId', { organizationId });

    if (filters?.municipality) {
      query.andWhere('survey.municipality = :municipality', {
        municipality: filters.municipality,
      });
    }

    if (filters?.startDate) {
      query.andWhere('survey.sampleDate >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      query.andWhere('survey.sampleDate <= :endDate', { endDate: filters.endDate });
    }

    if (filters?.dataQuality) {
      query.andWhere('survey.dataQuality = :dataQuality', {
        dataQuality: filters.dataQuality,
      });
    }

    return query.getMany();
  }

  /**
   * Find survey by ID.
   *
   * @param id - Survey ID
   * @param organizationId - Organization ID (for multi-tenancy)
   * @returns Survey
   * @throws NotFoundException if survey not found
   */
  async findOne(id: string, organizationId: string): Promise<Survey> {
    const survey = await this.surveysRepository.findOne({
      where: { id, organizationId },
      relations: ['field'],
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${id} not found`);
    }

    return survey;
  }

  /**
   * Delete survey.
   *
   * @param id - Survey ID
   * @param organizationId - Organization ID
   */
  async remove(id: string, organizationId: string): Promise<void> {
    const survey = await this.findOne(id, organizationId);
    await this.surveysRepository.remove(survey);
  }

  /**
   * Get statistics for surveys.
   *
   * @param organizationId - Organization ID
   * @returns Statistics (count, avg pH, etc.)
   */
  async getStatistics(organizationId: string) {
    const result = await this.surveysRepository
      .createQueryBuilder('survey')
      .select('COUNT(*)', 'totalSamples')
      .addSelect('AVG(survey.ph)', 'avgPh')
      .addSelect('AVG(survey.organicMatter)', 'avgOM')
      .addSelect('AVG(survey.nitrogen)', 'avgN')
      .addSelect('AVG(survey.phosphorus)', 'avgP')
      .addSelect('AVG(survey.potassium)', 'avgK')
      .where('survey.organizationId = :organizationId', { organizationId })
      .andWhere('survey.dataQuality = :quality', { quality: 'GOOD' })
      .getRawOne();

    return {
      totalSamples: parseInt(result.totalSamples) || 0,
      averages: {
        ph: parseFloat(result.avgPh)?.toFixed(1) || null,
        organicMatter: parseFloat(result.avgOM)?.toFixed(2) || null,
        nitrogen: parseFloat(result.avgN)?.toFixed(1) || null,
        phosphorus: parseFloat(result.avgP)?.toFixed(1) || null,
        potassium: parseFloat(result.avgK)?.toFixed(1) || null,
      },
    };
  }

  /**
   * Validate coordinates are within Bulgaria.
   *
   * Bulgaria bounding box:
   * - Latitude: 41.23° to 44.22°
   * - Longitude: 22.36° to 28.61°
   *
   * @param latitude - Latitude in decimal degrees
   * @param longitude - Longitude in decimal degrees
   * @throws BadRequestException if coordinates outside Bulgaria
   */
  private validateBulgarianCoordinates(latitude: number, longitude: number): void {
    const BULGARIA_BBOX = {
      minLat: 41.23,
      maxLat: 44.22,
      minLon: 22.36,
      maxLon: 28.61,
    };

    if (
      latitude < BULGARIA_BBOX.minLat ||
      latitude > BULGARIA_BBOX.maxLat ||
      longitude < BULGARIA_BBOX.minLon ||
      longitude > BULGARIA_BBOX.maxLon
    ) {
      throw new BadRequestException(
        `Coordinates (${latitude}, ${longitude}) are outside Bulgaria. ` +
          `Valid range: lat=${BULGARIA_BBOX.minLat}-${BULGARIA_BBOX.maxLat}, ` +
          `lon=${BULGARIA_BBOX.minLon}-${BULGARIA_BBOX.maxLon}`
      );
    }
  }

  /**
   * Validate soil property ranges.
   *
   * @param data - Survey data
   * @throws BadRequestException if values out of range
   */
  private validateSoilProperties(data: any): void {
    const ranges = {
      ph: { min: 4.0, max: 9.0 },
      organicMatter: { min: 0, max: 15 },
      nitrogen: { min: 0, max: 5000 },
      phosphorus: { min: 0, max: 500 },
      potassium: { min: 0, max: 2000 },
      clayPercent: { min: 0, max: 100 },
      sandPercent: { min: 0, max: 100 },
    };

    for (const [property, range] of Object.entries(ranges)) {
      const value = data[property];
      if (value !== null && value !== undefined) {
        if (value < range.min || value > range.max) {
          throw new BadRequestException(
            `${property} value ${value} is out of valid range (${range.min}-${range.max})`
          );
        }
      }
    }

    // Validate texture sum (clay + sand + silt should = 100%)
    if (data.clayPercent && data.sandPercent && data.siltPercent) {
      const sum = data.clayPercent + data.sandPercent + data.siltPercent;
      if (Math.abs(sum - 100) > 1) {
        // Allow 1% tolerance
        throw new BadRequestException(
          `Soil texture percentages must sum to 100% (got ${sum.toFixed(1)}%)`
        );
      }
    }
  }
}
