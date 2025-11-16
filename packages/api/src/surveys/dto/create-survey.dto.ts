import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsDate,
  IsString,
  IsOptional,
  Min,
  Max,
  IsInt,
  IsNotEmpty,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new soil survey.
 * Follows ISO 28258:2013 standard.
 */
export class CreateSurveyDto {
  @ApiProperty({ example: 42.7339, description: 'Sample latitude (WGS84)' })
  @IsNumber()
  @Min(41.23)
  @Max(44.22)
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ example: 25.4858, description: 'Sample longitude (WGS84)' })
  @IsNumber()
  @Min(22.36)
  @Max(28.61)
  @IsNotEmpty()
  longitude: number;

  @ApiProperty({ example: '2024-04-15', description: 'Sample collection date' })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  sampleDate: Date;

  @ApiProperty({ example: 20, description: 'Sampling depth in cm', default: 20 })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  depthCm?: number;

  @ApiProperty({ example: 6.8, description: 'Soil pH (1:5 water)', required: false })
  @IsNumber()
  @Min(4.0)
  @Max(9.0)
  @IsOptional()
  ph?: number;

  @ApiProperty({
    example: 3.2,
    description: 'Organic matter percentage',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(15)
  @IsOptional()
  organicMatter?: number;

  @ApiProperty({ example: 120.5, description: 'Total nitrogen (mg/kg)', required: false })
  @IsNumber()
  @Min(0)
  @Max(5000)
  @IsOptional()
  nitrogen?: number;

  @ApiProperty({
    example: 45.2,
    description: 'Available phosphorus (mg/kg)',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(500)
  @IsOptional()
  phosphorus?: number;

  @ApiProperty({
    example: 280.3,
    description: 'Exchangeable potassium (mg/kg)',
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(2000)
  @IsOptional()
  potassium?: number;

  @ApiProperty({ example: 32.5, description: 'Clay content (%)', required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  clayPercent?: number;

  @ApiProperty({ example: 28.1, description: 'Sand content (%)', required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  sandPercent?: number;

  @ApiProperty({ example: 39.4, description: 'Silt content (%)', required: false })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  siltPercent?: number;

  @ApiProperty({ example: 'Parvomay', description: 'Municipality', required: false })
  @IsString()
  @IsOptional()
  municipality?: string;

  @ApiProperty({ example: 'Plovdiv', description: 'District', required: false })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiProperty({ example: 'ISO 10390', description: 'Laboratory method', required: false })
  @IsString()
  @IsOptional()
  labMethod?: string;

  @ApiProperty({
    example: 'GOOD',
    description: 'Data quality flag',
    enum: ['GOOD', 'SUSPECT', 'REJECTED'],
    default: 'GOOD',
  })
  @IsString()
  @IsIn(['GOOD', 'SUSPECT', 'REJECTED'])
  @IsOptional()
  dataQuality?: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Associated field ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  fieldId?: string;
}
