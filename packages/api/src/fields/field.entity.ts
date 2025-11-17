import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Geometry } from 'geojson';
import { Organization } from '../organizations/organization.entity';

/**
 * Field entity represents a farmer's agricultural parcel.
 *
 * Stores geospatial boundaries and metadata for field management.
 * Used as the primary unit for soil mapping, VRA prescriptions, and insurance assessment.
 *
 * References:
 * - ADR-005: PostgreSQL + PostGIS for geospatial queries
 * - Bulgarian LPIS (Land Parcel Identification System) for CAP subsidy compliance
 */
@Entity('fields')
@Index(['organizationId'])
@Index(['geometry'], { spatial: true })
export class Field {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.id, { onDelete: 'CASCADE' })
  organization: Organization;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * Field boundary geometry (Polygon or MultiPolygon).
   * Stored in WGS84 (EPSG:4326) coordinate system.
   * Use ST_Transform for Bulgarian coordinate systems (EPSG:32635 - UTM Zone 35N).
   */
  @Column({
    type: 'geography',
    spatialFeatureType: 'Polygon',
    srid: 4326,
  })
  geometry: Geometry;

  /**
   * Area in hectares (automatically calculated from geometry).
   * Stored as GENERATED column in PostgreSQL.
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    generatedType: 'STORED',
    asExpression: 'ST_Area(geometry::geography) / 10000',
  })
  areaHectares: number;

  /**
   * Optional crop type for current season.
   * Values: 'wheat', 'sunflower', 'maize', 'barley', 'rapeseed', etc.
   */
  @Column({ length: 50, nullable: true })
  cropType: string;

  /**
   * Crop year (growing season).
   * Used for partitioning related tables (maps, prescriptions).
   */
  @Column({ type: 'int', nullable: true })
  cropYear: number;

  /**
   * Bulgarian municipality name (e.g., 'Parvomay', 'Plovdiv').
   * Used for feature flag targeting (ADR-007: Unleash).
   */
  @Column({ length: 100, nullable: true })
  municipality: string;

  /**
   * District (oblast) name (e.g., 'Plovdiv', 'Sofia').
   */
  @Column({ length: 100, nullable: true })
  district: string;

  /**
   * External identifier from LPIS (Land Parcel Identification System).
   * Links to Bulgarian Ministry of Agriculture CAP subsidy system.
   */
  @Column({ length: 50, nullable: true, unique: true })
  lpisId: string;

  /**
   * Additional metadata (JSON).
   * Stores farm-specific data (irrigation status, soil type, etc.).
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  /**
   * Indicates if this is a temporary field for quick analysis.
   * Temporary fields are auto-deleted after 30 days or when converted to permanent.
   */
  @Column({ type: 'boolean', default: false })
  temporary: boolean;

  /**
   * Expiration date for temporary fields.
   * Auto-cleanup job removes expired temporary fields.
   */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
