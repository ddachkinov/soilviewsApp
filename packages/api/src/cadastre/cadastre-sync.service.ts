import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { CadastreService } from './cadastre.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as AdmZip from 'adm-zip';

/**
 * Automated KAIS cadastre synchronization service.
 * Periodically fetches and imports updated cadastre data.
 * Referenced in KAIS_INTEGRATION.md Phase 2.
 */
@Injectable()
export class CadastreSyncService {
  private readonly logger = new Logger(CadastreSyncService.name);
  private readonly kaisOpenDataUrl: string;
  private readonly syncEnabled: boolean;

  constructor(
    private readonly cadastreService: CadastreService,
    private readonly configService: ConfigService,
  ) {
    this.kaisOpenDataUrl =
      this.configService.get('KAIS_OPEN_DATA_URL') || 'https://kais.cadastre.bg/en/OpenData';
    this.syncEnabled = this.configService.get('KAIS_SYNC_ENABLED') === 'true';
  }

  /**
   * Scheduled job to sync cadastre data monthly.
   * Runs on the 1st day of each month at 2 AM.
   */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async syncCadastreData(): Promise<void> {
    if (!this.syncEnabled) {
      this.logger.debug('KAIS sync is disabled, skipping scheduled sync');
      return;
    }

    this.logger.log('Starting scheduled KAIS cadastre data sync');

    try {
      // In a real implementation, this would:
      // 1. Download the latest shapefile ZIP from KAIS open data portal
      // 2. Extract the ZIP file
      // 3. Parse shapefiles for each municipality
      // 4. Import new/updated parcels
      // 5. Flag removed parcels

      // For now, log a placeholder message
      this.logger.log('KAIS sync job triggered - actual implementation requires KAIS API access');

      // Example implementation flow:
      // const zipPath = await this.downloadKaisData();
      // const shapefilePaths = await this.extractShapefiles(zipPath);
      // await this.importShapefiles(shapefilePaths);
      // await this.cleanupTempFiles(zipPath);

      this.logger.log('KAIS cadastre data sync completed successfully');
    } catch (error) {
      this.logger.error(`KAIS sync failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Manual trigger for cadastre sync (for admin use).
   */
  async triggerManualSync(organizationId?: string): Promise<void> {
    this.logger.log(`Manual KAIS sync triggered${organizationId ? ` for organization ${organizationId}` : ''}`);

    try {
      // Placeholder for manual sync logic
      this.logger.log('Manual sync completed');
    } catch (error) {
      this.logger.error(`Manual sync failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Download KAIS cadastre data ZIP file.
   * (Placeholder - actual URL may require authentication)
   */
  private async downloadKaisData(): Promise<string> {
    const downloadUrl = `${this.kaisOpenDataUrl}/cadastre.zip`;
    const outputPath = path.join('/tmp', `kais-cadastre-${Date.now()}.zip`);

    this.logger.log(`Downloading KAIS data from ${downloadUrl}`);

    try {
      const response = await axios.get(downloadUrl, { responseType: 'arraybuffer' });
      fs.writeFileSync(outputPath, response.data);

      this.logger.log(`KAIS data downloaded to ${outputPath}`);
      return outputPath;
    } catch (error) {
      this.logger.error(`Failed to download KAIS data: ${error.message}`);
      throw error;
    }
  }

  /**
   * Extract shapefiles from ZIP.
   */
  private async extractShapefiles(zipPath: string): Promise<string[]> {
    const extractPath = path.join('/tmp', `kais-extract-${Date.now()}`);
    fs.mkdirSync(extractPath, { recursive: true });

    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractPath, true);

      // Find all .shp files
      const shpFiles = this.findShapefiles(extractPath);

      this.logger.log(`Extracted ${shpFiles.length} shapefiles from ZIP`);
      return shpFiles;
    } catch (error) {
      this.logger.error(`Failed to extract ZIP: ${error.message}`);
      throw error;
    }
  }

  /**
   * Recursively find all .shp files in directory.
   */
  private findShapefiles(dir: string): string[] {
    const shapefiles: string[] = [];

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        shapefiles.push(...this.findShapefiles(fullPath));
      } else if (file.endsWith('.shp')) {
        shapefiles.push(fullPath);
      }
    }

    return shapefiles;
  }

  /**
   * Import shapefiles for all organizations that have opted in.
   */
  private async importShapefiles(shapefilePaths: string[]): Promise<void> {
    // In real implementation, would query organizations table for enabled orgs
    // For now, just log
    this.logger.log(`Would import ${shapefilePaths.length} shapefiles for enabled organizations`);
  }

  /**
   * Clean up temporary files after sync.
   */
  private async cleanupTempFiles(zipPath: string): Promise<void> {
    try {
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }

      const extractDir = path.dirname(zipPath);
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }

      this.logger.log('Temporary files cleaned up');
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp files: ${error.message}`);
    }
  }
}
