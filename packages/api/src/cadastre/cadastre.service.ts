import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Field } from '../fields/field.entity';
import * as shapefile from 'shapefile';
import * as proj4 from 'proj4';

/**
 * KAIS Cadastre integration service.
 * Handles Bulgarian cadastre data import and validation.
 * Referenced in KAIS_INTEGRATION.md documentation.
 */
@Injectable()
export class CadastreService {
  private readonly logger = new Logger(CadastreService.name);

  // Define Bulgarian coordinate system (BGS 2005 / UTM Zone 35N)
  private readonly BGS2005_EPSG = 'EPSG:7801';
  private readonly WGS84_EPSG = 'EPSG:4326';

  // Bulgaria bounding box for validation
  private readonly BULGARIA_BBOX = {
    minLat: 41.23,
    maxLat: 44.22,
    minLon: 22.36,
    maxLon: 28.61,
  };

  // Cadastre ID validation regex: XXXXX.YY.ZZZ
  private readonly CADASTRE_ID_REGEX = /^\d{5}\.\d{1,3}\.\d{1,4}$/;

  constructor(
    @InjectRepository(Field)
    private fieldsRepository: Repository<Field>,
  ) {
    // Define BGS 2005 projection (Bulgarian Geodetic System 2005)
    proj4.defs(
      this.BGS2005_EPSG,
      '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    );
  }

  /**
   * Import fields from KAIS cadastre shapefile.
   * Transforms coordinates from BGS2005 to WGS84.
   */
  async importShapefile(
    shpBuffer: Buffer,
    dbfBuffer: Buffer,
    organizationId: string,
  ): Promise<{ count: number; fields: Field[] }> {
    this.logger.log(`Starting shapefile import for organization ${organizationId}`);

    try {
      const source = await shapefile.open(shpBuffer, dbfBuffer);
      const fields: Field[] = [];
      let result = await source.read();
      let processedCount = 0;
      let skippedCount = 0;

      while (!result.done) {
        const feature = result.value;

        try {
          // Extract cadastre ID from properties
          const cadastreId =
            feature.properties?.cadastre_id ||
            feature.properties?.CADASTRE_ID ||
            feature.properties?.KOD ||
            feature.properties?.EKATTE;

          // Validate cadastre ID format
          if (cadastreId && !this.CADASTRE_ID_REGEX.test(cadastreId)) {
            this.logger.warn(`Invalid cadastre ID format: ${cadastreId}`);
          }

          // Check if field already exists
          const existingField = await this.fieldsRepository.findOne({
            where: { organizationId, lpisId: cadastreId },
          });

          if (existingField) {
            this.logger.debug(`Field with cadastre ID ${cadastreId} already exists, skipping`);
            skippedCount++;
            result = await source.read();
            continue;
          }

          // Transform geometry from BGS2005 to WGS84
          const wgs84Geometry = this.transformGeometry(feature.geometry);

          // Validate geometry is within Bulgaria
          if (!this.isWithinBulgaria(wgs84Geometry)) {
            this.logger.warn(`Geometry outside Bulgaria bounds, skipping cadastre ID: ${cadastreId}`);
            skippedCount++;
            result = await source.read();
            continue;
          }

          // Calculate area (rough approximation)
          const areaHectares = this.calculateArea(wgs84Geometry);

          // Validate minimum area (0.01 ha = 100 m²)
          if (areaHectares < 0.01) {
            this.logger.warn(`Field too small (${areaHectares} ha), skipping cadastre ID: ${cadastreId}`);
            skippedCount++;
            result = await source.read();
            continue;
          }

          // Extract parcel name from properties
          const parcelName =
            feature.properties?.name ||
            feature.properties?.NAME ||
            feature.properties?.parcel_name ||
            `Parcel ${cadastreId || processedCount + 1}`;

          // Create field entity
          const field = this.fieldsRepository.create({
            organizationId,
            name: parcelName,
            geometry: wgs84Geometry,
            lpisId: cadastreId,
            notes: `Imported from KAIS cadastre on ${new Date().toISOString()}`,
          });

          fields.push(field);
          processedCount++;
        } catch (error) {
          this.logger.error(`Error processing feature: ${error.message}`, error.stack);
          skippedCount++;
        }

        result = await source.read();
      }

      // Bulk save all fields
      if (fields.length > 0) {
        await this.fieldsRepository.save(fields);
        this.logger.log(
          `Successfully imported ${fields.length} fields (${skippedCount} skipped) for organization ${organizationId}`,
        );
      } else {
        this.logger.warn(`No valid fields found in shapefile for organization ${organizationId}`);
      }

      return { count: fields.length, fields };
    } catch (error) {
      this.logger.error(`Shapefile import failed: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to import shapefile: ${error.message}`);
    }
  }

  /**
   * Search for field by KAIS cadastre ID.
   */
  async searchByCadastreId(cadastreId: string, organizationId: string): Promise<Field | null> {
    // Validate cadastre ID format
    if (!this.CADASTRE_ID_REGEX.test(cadastreId)) {
      throw new BadRequestException(
        `Invalid cadastre ID format. Expected format: XXXXX.YY.ZZZ (e.g., 58761.34.12)`,
      );
    }

    const field = await this.fieldsRepository.findOne({
      where: { organizationId, lpisId: cadastreId },
    });

    return field;
  }

  /**
   * Search for fields by EKATTE code (municipality).
   */
  async searchByEkatte(ekatteCode: string, organizationId: string): Promise<Field[]> {
    // EKATTE is the first 5 digits of cadastre ID
    const pattern = `${ekatteCode}.%`;

    const fields = await this.fieldsRepository
      .createQueryBuilder('field')
      .where('field.organizationId = :organizationId', { organizationId })
      .andWhere('field.lpisId LIKE :pattern', { pattern })
      .getMany();

    return fields;
  }

  /**
   * Transform geometry from BGS2005 to WGS84.
   */
  private transformGeometry(geometry: any): any {
    if (geometry.type === 'Polygon') {
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring: number[][]) =>
          ring.map(([x, y]: number[]) => {
            const [lon, lat] = proj4(this.BGS2005_EPSG, this.WGS84_EPSG, [x, y]);
            return [lon, lat];
          }),
        ),
      };
    } else if (geometry.type === 'MultiPolygon') {
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((polygon: number[][][]) =>
          polygon.map((ring: number[][]) =>
            ring.map(([x, y]: number[]) => {
              const [lon, lat] = proj4(this.BGS2005_EPSG, this.WGS84_EPSG, [x, y]);
              return [lon, lat];
            }),
          ),
        ),
      };
    }

    return geometry;
  }

  /**
   * Check if geometry is within Bulgaria bounds.
   */
  private isWithinBulgaria(geometry: any): boolean {
    const coords = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0][0];

    for (const [lon, lat] of coords) {
      if (
        lat < this.BULGARIA_BBOX.minLat ||
        lat > this.BULGARIA_BBOX.maxLat ||
        lon < this.BULGARIA_BBOX.minLon ||
        lon > this.BULGARIA_BBOX.maxLon
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculate approximate area in hectares using Shoelace formula.
   */
  private calculateArea(geometry: any): number {
    const coords = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0][0];

    // Shoelace formula (approximate for small areas)
    let area = 0;
    const n = coords.length;

    for (let i = 0; i < n - 1; i++) {
      const [lon1, lat1] = coords[i];
      const [lon2, lat2] = coords[i + 1];

      // Convert to meters (rough approximation)
      const x1 = lon1 * 111000 * Math.cos((lat1 * Math.PI) / 180);
      const y1 = lat1 * 111000;
      const x2 = lon2 * 111000 * Math.cos((lat2 * Math.PI) / 180);
      const y2 = lat2 * 111000;

      area += x1 * y2 - x2 * y1;
    }

    area = Math.abs(area) / 2;

    // Convert m² to hectares
    return area / 10000;
  }

  /**
   * Validate cadastre ID format.
   */
  validateCadastreId(cadastreId: string): boolean {
    return this.CADASTRE_ID_REGEX.test(cadastreId);
  }

  /**
   * Extract EKATTE code from cadastre ID.
   */
  extractEkatte(cadastreId: string): string {
    if (!this.validateCadastreId(cadastreId)) {
      throw new BadRequestException('Invalid cadastre ID format');
    }

    return cadastreId.split('.')[0];
  }
}
