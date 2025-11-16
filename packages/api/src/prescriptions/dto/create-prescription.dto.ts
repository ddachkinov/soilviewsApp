import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsIn,
  IsNumber,
  Min,
  Max,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class TargetRatesDto {
  @ApiProperty({ example: 120, description: 'Nitrogen rate (kg/ha)' })
  @IsNumber()
  @Min(0)
  @Max(300)
  n: number;

  @ApiProperty({ example: 60, description: 'Phosphorus rate as P2O5 (kg/ha)' })
  @IsNumber()
  @Min(0)
  @Max(200)
  p: number;

  @ApiProperty({ example: 80, description: 'Potassium rate as K2O (kg/ha)' })
  @IsNumber()
  @Min(0)
  @Max(300)
  k: number;
}

/**
 * DTO for creating a VRA prescription.
 */
export class CreatePrescriptionDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Field UUID',
  })
  @IsUUID()
  @IsNotEmpty()
  fieldId: string;

  @ApiProperty({
    example: 'wheat',
    description: 'Crop type',
    enum: ['wheat', 'sunflower', 'maize'],
  })
  @IsString()
  @IsIn(['wheat', 'sunflower', 'maize'])
  @IsNotEmpty()
  cropType: string;

  @ApiProperty({ example: 'autumn-2024', description: 'Growing season' })
  @IsString()
  @IsNotEmpty()
  season: string;

  @ApiProperty({
    example: 'VARIABLE',
    description: 'Application strategy',
    enum: ['VARIABLE', 'UNIFORM', 'ZONE_BASED'],
    default: 'VARIABLE',
  })
  @IsString()
  @IsIn(['VARIABLE', 'UNIFORM', 'ZONE_BASED'])
  @IsOptional()
  strategy?: string;

  @ApiProperty({ type: TargetRatesDto, description: 'Target nutrient rates' })
  @ValidateNested()
  @Type(() => TargetRatesDto)
  @IsNotEmpty()
  targetRates: TargetRatesDto;

  @ApiProperty({ example: 5.5, description: 'Yield goal (t/ha)', required: false })
  @IsNumber()
  @Min(0)
  @Max(15)
  @IsOptional()
  yieldGoal?: number;

  @ApiProperty({
    example: 'nutrient_removal',
    description: 'Calculation method',
    enum: ['nutrient_removal', 'sufficiency', 'recommendation'],
    default: 'nutrient_removal',
  })
  @IsString()
  @IsIn(['nutrient_removal', 'sufficiency', 'recommendation'])
  @IsOptional()
  method?: string;

  @ApiProperty({ example: 0.7, description: 'Fertilizer efficiency (0-1)', required: false })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  efficiency?: number;
}
