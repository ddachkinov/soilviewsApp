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
import { MapsService } from './maps.service';
import { CreateMapDto } from './dto/create-map.dto';
import { QueryMapsDto } from './dto/query-maps.dto';
import { Map } from './map.entity';

@ApiTags('maps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('maps')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Post()
  @ApiOperation({ summary: 'Request soil property map generation' })
  @ApiResponse({ status: 201, description: 'Map generation job created', type: Map })
  @ApiResponse({ status: 404, description: 'Field not found' })
  async create(@Body() createMapDto: CreateMapDto, @Request() req): Promise<Map> {
    return this.mapsService.create(createMapDto, req.user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all maps with optional filters' })
  @ApiResponse({ status: 200, description: 'Maps retrieved successfully' })
  async findAll(@Query() queryDto: QueryMapsDto, @Request() req): Promise<{ maps: Map[]; total: number }> {
    return this.mapsService.findAll(queryDto, req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get map by ID' })
  @ApiResponse({ status: 200, description: 'Map retrieved successfully', type: Map })
  @ApiResponse({ status: 404, description: 'Map not found' })
  async findOne(@Param('id') id: string, @Request() req): Promise<Map> {
    return this.mapsService.findOne(id, req.user.organizationId);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get map statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Map not found' })
  async getStatistics(@Param('id') id: string, @Request() req): Promise<any> {
    const map = await this.mapsService.findOne(id, req.user.organizationId);
    return map.statistics;
  }

  @Get('field/:fieldId/statistics')
  @ApiOperation({ summary: 'Get all soil property statistics for a field' })
  @ApiResponse({ status: 200, description: 'Field statistics retrieved successfully' })
  async getFieldStatistics(@Param('fieldId') fieldId: string, @Request() req): Promise<any> {
    return this.mapsService.getFieldStatistics(fieldId, req.user.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a map' })
  @ApiResponse({ status: 204, description: 'Map deleted successfully' })
  @ApiResponse({ status: 404, description: 'Map not found' })
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    return this.mapsService.remove(id, req.user.organizationId);
  }
}
