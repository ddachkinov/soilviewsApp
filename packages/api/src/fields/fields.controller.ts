import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FieldsService } from './fields.service';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Fields API endpoints.
 *
 * Manages farmer parcels (field boundaries, metadata, crop types).
 * All operations are scoped to user's organization (multi-tenancy).
 *
 * References:
 * - ADR-005: PostGIS for spatial queries (ST_Contains, ST_Area, etc.)
 */
@ApiTags('fields')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('fields')
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Get()
  @ApiOperation({ summary: 'List all fields for current organization' })
  @ApiResponse({ status: 200, description: 'Fields retrieved successfully' })
  @ApiQuery({ name: 'municipality', required: false, description: 'Filter by municipality' })
  @ApiQuery({ name: 'cropType', required: false, description: 'Filter by crop type' })
  async findAll(
    @CurrentUser() user,
    @Query('municipality') municipality?: string,
    @Query('cropType') cropType?: string
  ) {
    return this.fieldsService.findAll(user.organizationId, { municipality, cropType });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get field by ID' })
  @ApiResponse({ status: 200, description: 'Field retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.fieldsService.findOne(id, user.organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new field' })
  @ApiResponse({ status: 201, description: 'Field created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid geometry or data' })
  async create(@Body() createFieldDto: CreateFieldDto, @CurrentUser() user) {
    return this.fieldsService.create(createFieldDto, user.organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update field' })
  @ApiResponse({ status: 200, description: 'Field updated successfully' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async update(
    @Param('id') id: string,
    @Body() updateFieldDto: UpdateFieldDto,
    @CurrentUser() user
  ) {
    return this.fieldsService.update(id, updateFieldDto, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete field' })
  @ApiResponse({ status: 200, description: 'Field deleted successfully' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async remove(@Param('id') id: string, @CurrentUser() user) {
    return this.fieldsService.remove(id, user.organizationId);
  }

  /**
   * Calculate total area of all fields in organization.
   * Uses PostgreSQL ST_Area aggregate function.
   */
  @Get('stats/total-area')
  @ApiOperation({ summary: 'Get total area of all fields (hectares)' })
  @ApiResponse({ status: 200, description: 'Total area calculated' })
  async getTotalArea(@CurrentUser() user) {
    return this.fieldsService.getTotalArea(user.organizationId);
  }

  /**
   * Create temporary field for quick analysis.
   * Expires after 30 days if not converted to permanent.
   */
  @Post('temporary')
  @ApiOperation({ summary: 'Create temporary field for quick analysis' })
  @ApiResponse({ status: 201, description: 'Temporary field created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid geometry' })
  async createTemporary(@Body('geometry') geometry: any, @CurrentUser() user) {
    return this.fieldsService.createTemporary(geometry, user.organizationId);
  }

  /**
   * Convert temporary field to permanent.
   */
  @Post(':id/convert-to-permanent')
  @ApiOperation({ summary: 'Convert temporary field to permanent' })
  @ApiResponse({ status: 200, description: 'Field converted successfully' })
  @ApiResponse({ status: 404, description: 'Field not found or not temporary' })
  async convertToPermanent(
    @Param('id') id: string,
    @Body() updateData: { name?: string; cropType?: string; notes?: string },
    @CurrentUser() user
  ) {
    return this.fieldsService.convertToPermanent(id, user.organizationId, updateData);
  }
}
