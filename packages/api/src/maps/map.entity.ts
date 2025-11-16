import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Field } from '../fields/field.entity';

/**
 * Soil property map entity.
 * Stores generated maps as Cloud-Optimized GeoTIFFs (COGs).
 * Referenced in ADR-007 (TiTiler integration) and ADR-006 (Lambda inference).
 */
@Entity('maps')
@Index(['fieldId', 'property', 'generatedAt'])
@Index(['organizationId', 'status'])
export class Map {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Column({ type: 'uuid' })
  @Index()
  organizationId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Column({ type: 'uuid' })
  fieldId: string;

  @ManyToOne(() => Field, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fieldId' })
  field: Field;

  @ApiProperty({
    example: 'ph',
    description: 'Soil property mapped',
    enum: ['ph', 'organic_matter', 'nitrogen', 'phosphorus', 'potassium', 'clay_percent', 'sand_percent'],
  })
  @Column({ length: 50 })
  property: string;

  @ApiProperty({ example: 's3://soilviews-maps-prod/org-uuid/field-uuid/ph_2024-04-15.tif' })
  @Column({ type: 'text' })
  cogUrl: string;

  @ApiProperty({ example: 'https://titiler.soilviews.bg/cog/tiles/{z}/{x}/{y}?url=...' })
  @Column({ type: 'text', nullable: true })
  tileUrl?: string;

  @ApiProperty({ example: { min: 5.2, max: 7.8, mean: 6.5, stdDev: 0.6 } })
  @Column({ type: 'jsonb' })
  statistics: {
    min: number;
    max: number;
    mean: number;
    stdDev: number;
    percentiles?: { p10: number; p25: number; p50: number; p75: number; p90: number };
  };

  @ApiProperty({ example: { encoder: 'efficientnet-b3', decoder: 'deeplabv3plus', version: 'v1.2.0' } })
  @Column({ type: 'jsonb' })
  modelMetadata: {
    encoder: string;
    decoder: string;
    version: string;
    r2Score?: number;
    rmse?: number;
    trainedOn?: string; // ISO date
  };

  @ApiProperty({ example: { sentinel2Dates: ['2024-03-20', '2024-04-05'], cloudCover: 12.5 } })
  @Column({ type: 'jsonb' })
  inputData: {
    sentinel2Dates: string[];
    sentinel1Dates?: string[];
    cloudCover: number;
    compositeMethod: string;
  };

  @ApiProperty({ example: 10, description: 'Spatial resolution in meters' })
  @Column({ type: 'int', default: 10 })
  resolutionMeters: number;

  @ApiProperty({
    example: 'COMPLETED',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
  @Column({ length: 20, default: 'PENDING' })
  status: string;

  @ApiProperty({ example: null })
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @ApiProperty({ example: 2024 })
  @Column({ type: 'int' })
  cropYear: number;

  @ApiProperty({ example: '2024-04-15T10:30:00Z' })
  @Column({ type: 'timestamptz' })
  generatedAt: Date;

  @ApiProperty({ example: 45.2, description: 'Processing time in seconds' })
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  processingTimeSeconds?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
