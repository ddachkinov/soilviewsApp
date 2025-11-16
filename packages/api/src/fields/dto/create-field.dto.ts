import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsObject, Min } from 'class-validator';
import { Geometry } from 'geojson';

/**
 * DTO for creating a new field.
 * Validates input according to GeoJSON spec and business rules.
 */
export class CreateFieldDto {
  @ApiProperty({ example: 'North Field', description: 'Field name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ required: false, example: 'Main wheat field', description: 'Optional description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [25.4858, 42.7339],
          [25.4868, 42.7339],
          [25.4868, 42.7349],
          [25.4858, 42.7349],
          [25.4858, 42.7339],
        ],
      ],
    },
    description: 'Field boundary (GeoJSON Polygon, EPSG:4326)',
  })
  @IsObject()
  @IsNotEmpty()
  geometry: Geometry;

  @ApiProperty({ required: false, example: 'wheat', description: 'Current crop type' })
  @IsString()
  @IsOptional()
  cropType?: string;

  @ApiProperty({ required: false, example: 2024, description: 'Crop year' })
  @IsInt()
  @Min(2020)
  @IsOptional()
  cropYear?: number;

  @ApiProperty({ required: false, example: 'Parvomay', description: 'Municipality name' })
  @IsString()
  @IsOptional()
  municipality?: string;

  @ApiProperty({ required: false, example: 'Plovdiv', description: 'District name' })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiProperty({ required: false, example: 'BG-12345-67890', description: 'LPIS identifier' })
  @IsString()
  @IsOptional()
  lpisId?: string;
}
