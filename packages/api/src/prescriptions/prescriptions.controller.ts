import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { Prescription } from './prescription.entity';

@ApiTags('prescriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create VRA prescription for fertilizer application' })
  @ApiResponse({ status: 201, description: 'Prescription created successfully', type: Prescription })
  @ApiResponse({ status: 400, description: 'Missing required soil property maps' })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async create(@Body() createDto: CreatePrescriptionDto, @Request() req): Promise<Prescription> {
    return this.prescriptionsService.create(createDto, req.user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all prescriptions' })
  @ApiResponse({ status: 200, description: 'Prescriptions retrieved successfully' })
  async findAll(@Query('fieldId') fieldId: string, @Request() req): Promise<Prescription[]> {
    return this.prescriptionsService.findAll(req.user.organizationId, fieldId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get prescription by ID' })
  @ApiResponse({ status: 200, description: 'Prescription retrieved', type: Prescription })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async findOne(@Param('id') id: string, @Request() req): Promise<Prescription> {
    return this.prescriptionsService.findOne(id, req.user.organizationId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Get shapefile download URL' })
  @ApiResponse({ status: 200, description: 'Download URL generated' })
  @ApiResponse({ status: 400, description: 'Shapefile not available' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async getDownloadUrl(@Param('id') id: string, @Request() req): Promise<{ url: string }> {
    const url = await this.prescriptionsService.getDownloadUrl(id, req.user.organizationId);
    return { url };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a prescription' })
  @ApiResponse({ status: 204, description: 'Prescription deleted' })
  @ApiResponse({ status: 404, description: 'Prescription not found' })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.prescriptionsService.remove(id, req.user.organizationId);
  }
}
