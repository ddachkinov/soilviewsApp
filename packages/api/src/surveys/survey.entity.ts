import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Point } from 'geojson';
import { Organization } from '../organizations/organization.entity';
import { Field } from '../fields/field.entity';

/**
 * Survey entity represents ground-truth soil sample measurements.
 *
 * Implements ISO 28258:2013 (Soil Quality - Digital Exchange) schema.
 * Used for training ML models and validating predictions.
 *
 * References:
 * - ADR-008: Apache Parquet for ground-truth exchange
 * - ISO 28258:2013 standard
 * - Bulgarian national soil grid (347 samples @ 16 km spacing)
 */
@Entity('surveys')
@Index(['organizationId', 'sampleDate'])
@Index(['location'], { spatial: true })
export class Survey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  organization: Organization;

  @Column('uuid', { nullable: true })
  fieldId: string;

  @ManyToOne(() => Field, { nullable: true, onDelete: 'SET NULL' })
  field: Field;

  /**
   * Sample location (GPS coordinates).
   * Stored as PostGIS POINT geometry.
   */
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: Point;

  /**
   * Date when soil sample was collected.
   */
  @Column({ type: 'date' })
  sampleDate: Date;

  /**
   * Sampling depth in centimeters.
   * Typical: 0-20 cm (topsoil)
   */
  @Column({ type: 'int', default: 20 })
  depthCm: number;

  // Soil Properties (ISO 28258 fields)

  /**
   * Soil pH (1:5 water extraction, ISO 10390).
   * Valid range: 4.0-9.0
   */
  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  ph: number;

  /**
   * Organic Matter percentage (Walkley-Black or LOI method).
   * Valid range: 0-15%
   */
  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  organicMatter: number;

  /**
   * Total Nitrogen in mg/kg (Kjeldahl method).
   */
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  nitrogen: number;

  /**
   * Available Phosphorus in mg/kg (Olsen method).
   */
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  phosphorus: number;

  /**
   * Exchangeable Potassium in mg/kg (ammonium acetate extraction).
   */
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  potassium: number;

  /**
   * Clay content (particle size < 0.002 mm) in %.
   */
  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  clayPercent: number;

  /**
   * Sand content (particle size 0.05-2 mm) in %.
   */
  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  sandPercent: number;

  /**
   * Silt content (calculated: 100 - clay - sand) in %.
   */
  @Column({ type: 'decimal', precision: 4, scale: 1, nullable: true })
  siltPercent: number;

  // Location metadata

  /**
   * Bulgarian municipality name (e.g., 'Parvomay', 'Plovdiv').
   */
  @Column({ length: 100, nullable: true })
  municipality: string;

  /**
   * District (oblast) name (e.g., 'Plovdiv', 'Sofia').
   */
  @Column({ length: 100, nullable: true })
  district: string;

  // Quality control

  /**
   * Laboratory method used for analysis.
   * Examples: 'ISO 10390', 'Walkley-Black', 'Olsen'
   */
  @Column({ length: 100, nullable: true })
  labMethod: string;

  /**
   * Data quality flag.
   * Values: 'GOOD', 'SUSPECT', 'REJECTED'
   */
  @Column({ length: 20, default: 'GOOD' })
  dataQuality: string;

  /**
   * Additional metadata (JSON).
   * Can store: lab name, sampler name, weather conditions, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
