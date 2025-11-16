import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsIn, IsInt, Min, IsOptional } from 'class-validator';

/**
 * DTO for querying maps.
 */
export class QueryMapsDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter by field ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  fieldId?: string;

  @ApiProperty({
    example: 'ph',
    description: 'Filter by property',
    required: false,
  })
  @IsString()
  @IsIn(['ph', 'organic_matter', 'nitrogen', 'phosphorus', 'potassium', 'clay_percent', 'sand_percent'])
  @IsOptional()
  property?: string;

  @ApiProperty({
    example: 2024,
    description: 'Filter by crop year',
    required: false,
  })
  @IsInt()
  @Min(2020)
  @IsOptional()
  cropYear?: number;

  @ApiProperty({
    example: 'COMPLETED',
    description: 'Filter by status',
    required: false,
  })
  @IsString()
  @IsIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'])
  @IsOptional()
  status?: string;

  @ApiProperty({ example: 10, description: 'Number of results per page', default: 10 })
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiProperty({ example: 0, description: 'Number of results to skip', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;
}
