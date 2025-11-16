import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsIn,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

/**
 * DTO for requesting soil property map generation.
 */
export class CreateMapDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Field UUID to generate map for',
  })
  @IsUUID()
  @IsNotEmpty()
  fieldId: string;

  @ApiProperty({
    example: 'ph',
    description: 'Soil property to map',
    enum: ['ph', 'organic_matter', 'nitrogen', 'phosphorus', 'potassium', 'clay_percent', 'sand_percent'],
  })
  @IsString()
  @IsIn(['ph', 'organic_matter', 'nitrogen', 'phosphorus', 'potassium', 'clay_percent', 'sand_percent'])
  @IsNotEmpty()
  property: string;

  @ApiProperty({ example: 2024, description: 'Crop year for analysis' })
  @IsInt()
  @Min(2020)
  @Max(2030)
  @IsNotEmpty()
  cropYear: number;

  @ApiProperty({
    example: '2024-03-01',
    description: 'Start date for satellite imagery composite',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    example: '2024-04-30',
    description: 'End date for satellite imagery composite',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    example: 20,
    description: 'Maximum cloud cover percentage',
    default: 20,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  maxCloudCover?: number;

  @ApiProperty({
    example: 10,
    description: 'Output resolution in meters',
    default: 10,
    enum: [10, 20],
  })
  @IsInt()
  @IsIn([10, 20])
  @IsOptional()
  resolutionMeters?: number;
}
