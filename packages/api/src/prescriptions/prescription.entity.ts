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
import { Map } from '../maps/map.entity';

/**
 * Variable Rate Application (VRA) prescription entity.
 * Generates site-specific fertilizer application rates.
 * Supports wheat, sunflower, and maize crops (Bulgaria's main crops).
 */
@Entity('prescriptions')
@Index(['fieldId', 'cropType', 'season'])
@Index(['organizationId', 'status'])
export class Prescription {
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
    example: 'wheat',
    description: 'Crop type',
    enum: ['wheat', 'sunflower', 'maize'],
  })
  @Column({ length: 50 })
  cropType: string;

  @ApiProperty({ example: 'autumn-2024', description: 'Growing season identifier' })
  @Column({ length: 50 })
  season: string;

  @ApiProperty({
    example: 'VARIABLE',
    description: 'Application strategy',
    enum: ['VARIABLE', 'UNIFORM', 'ZONE_BASED'],
  })
  @Column({ length: 20, default: 'VARIABLE' })
  strategy: string;

  @ApiProperty({
    example: { n: 120, p: 60, k: 80 },
    description: 'Target nutrient rates (kg/ha)',
  })
  @Column({ type: 'jsonb' })
  targetRates: {
    n: number; // Nitrogen
    p: number; // Phosphorus (P2O5)
    k: number; // Potassium (K2O)
  };

  @ApiProperty({
    example: 's3://soilviews-prescriptions/org-uuid/field-uuid/wheat_autumn-2024.shp',
  })
  @Column({ type: 'text' })
  shapefileUrl: string;

  @ApiProperty({ example: 's3://soilviews-prescriptions/org-uuid/field-uuid/wheat_autumn-2024.pdf' })
  @Column({ type: 'text', nullable: true })
  reportUrl?: string;

  @ApiProperty({
    example: { totalN: 12500, totalP: 6200, totalK: 8300, averageRate: 125 },
  })
  @Column({ type: 'jsonb' })
  statistics: {
    totalN: number; // Total N in kg
    totalP: number; // Total P2O5 in kg
    totalK: number; // Total K2O in kg
    averageRate: number; // kg/ha
    zoneCount?: number;
    minRate?: number;
    maxRate?: number;
  };

  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440000'],
    description: 'Soil property map IDs used',
  })
  @Column({ type: 'jsonb' })
  sourceMapIds: string[];

  @ApiProperty({
    example: {
      yieldGoal: 5.5,
      soilTestN: 120,
      soilTestP: 45,
      soilTestK: 280,
      method: 'nutrient_removal',
    },
  })
  @Column({ type: 'jsonb' })
  parameters: {
    yieldGoal?: number; // t/ha
    soilTestN?: number; // mg/kg
    soilTestP?: number; // mg/kg
    soilTestK?: number; // mg/kg
    method: string; // 'nutrient_removal' | 'sufficiency' | 'recommendation'
    efficiency?: number; // 0-1
  };

  @ApiProperty({
    example: 'COMPLETED',
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
  @Column({ length: 20, default: 'PENDING' })
  status: string;

  @ApiProperty({ example: null })
  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @ApiProperty({ example: '2024-09-15T10:30:00Z' })
  @Column({ type: 'timestamptz' })
  generatedAt: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
