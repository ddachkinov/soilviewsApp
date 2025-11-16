import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { MapsService } from '../maps.service';
import { SentinelHubService } from '../../sentinel-hub/sentinel-hub.service';

/**
 * Bull queue processor for soil property map generation.
 * Orchestrates the complete pipeline:
 * 1. Fetch Sentinel-2 and Sentinel-1 composites via Sentinel Hub
 * 2. Invoke AWS Lambda for ML inference
 * 3. Store COG in S3
 * 4. Update map record with results
 */
@Processor('map-generation')
export class MapGenerationProcessor {
  private readonly logger = new Logger(MapGenerationProcessor.name);

  constructor(
    private readonly mapsService: MapsService,
    private readonly sentinelHubService: SentinelHubService,
  ) {}

  @Process('generate-map')
  async handleMapGeneration(job: Job): Promise<void> {
    const {
      mapId,
      fieldId,
      property,
      cropYear,
      startDate,
      endDate,
      maxCloudCover,
      resolutionMeters,
      fieldGeometry,
    } = job.data;

    this.logger.log(`Starting map generation for map ${mapId}, property ${property}`);

    try {
      // Update status to PROCESSING
      await this.mapsService.updateMapStatus(mapId, 'PROCESSING');

      // Step 1: Fetch Sentinel-2 bare-soil composite
      this.logger.log(`Fetching Sentinel-2 composite for field ${fieldId}`);
      const sentinel2Result = await this.sentinelHubService.fetchBareSoilComposite({
        geometry: fieldGeometry,
        startDate,
        endDate,
        maxCloudCover,
        resolution: resolutionMeters,
      });

      // Step 2: Fetch Sentinel-1 SAR composite (optional)
      let sentinel1CogUrl = null;
      try {
        this.logger.log(`Fetching Sentinel-1 composite for field ${fieldId}`);
        const sentinel1Result = await this.sentinelHubService.fetchSentinel1Composite({
          geometry: fieldGeometry,
          startDate,
          endDate,
          resolution: resolutionMeters,
        });
        sentinel1CogUrl = sentinel1Result.cogUrl;
      } catch (error) {
        this.logger.warn(`Sentinel-1 fetch failed, continuing without SAR data: ${error.message}`);
      }

      // Step 3: Invoke Lambda for ML inference
      this.logger.log(`Invoking Lambda inference for map ${mapId}`);
      const startTime = Date.now();
      const inferenceResult = await this.mapsService.invokeLambdaInference(
        mapId,
        sentinel2Result.cogUrl,
        sentinel1CogUrl,
        property,
      );
      const processingTimeSeconds = (Date.now() - startTime) / 1000;

      // Step 4: Update map with results
      await this.mapsService.updateMapStatus(mapId, 'COMPLETED', {
        cogUrl: inferenceResult.cogUrl,
        statistics: inferenceResult.statistics,
        processingTimeSeconds,
        inputData: {
          sentinel2Dates: sentinel2Result.acquisitionDates,
          sentinel1Dates: sentinel1CogUrl ? ['SAR composite'] : [],
          cloudCover: sentinel2Result.cloudCover,
          compositeMethod: 'bare-soil',
        },
      });

      this.logger.log(`Map generation completed successfully for map ${mapId}`);
    } catch (error) {
      this.logger.error(`Map generation failed for map ${mapId}: ${error.message}`, error.stack);

      // Update status to FAILED
      await this.mapsService.updateMapStatus(mapId, 'FAILED', {
        errorMessage: error.message,
      });

      throw error; // Re-throw for Bull retry mechanism
    }
  }
}
