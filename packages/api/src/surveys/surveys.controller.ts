import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/**
 * Surveys API Controller
 *
 * Manages ground-truth soil sample data.
 * Supports Parquet file uploads (ADR-008).
 */
@ApiTags('surveys')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) {}

  @Post()
  @ApiOperation({ summary: 'Create new soil survey' })
  @ApiResponse({ status: 201, description: 'Survey created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or coordinates' })
  async create(@Body() createSurveyDto: CreateSurveyDto, @CurrentUser() user) {
    return this.surveysService.create(createSurveyDto, user.organizationId);
  }

  @Post('upload/parquet')
  @ApiOperation({ summary: 'Upload Parquet file with multiple surveys' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Surveys imported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid Parquet file' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadParquet(@UploadedFile() file: Express.Multer.File, @CurrentUser() user) {
    return this.surveysService.uploadParquet(file.buffer, user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List all surveys for organization' })
  @ApiResponse({ status: 200, description: 'Surveys retrieved successfully' })
  @ApiQuery({ name: 'municipality', required: false, description: 'Filter by municipality' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dataQuality', required: false, description: 'Filter by quality (GOOD/SUSPECT/REJECTED)' })
  async findAll(
    @CurrentUser() user,
    @Query('municipality') municipality?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dataQuality') dataQuality?: string
  ) {
    const filters: any = {};
    if (municipality) filters.municipality = municipality;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (dataQuality) filters.dataQuality = dataQuality;

    return this.surveysService.findAll(user.organizationId, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get survey statistics (count, averages)' })
  @ApiResponse({ status: 200, description: 'Statistics calculated' })
  async getStatistics(@CurrentUser() user) {
    return this.surveysService.getStatistics(user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get survey by ID' })
  @ApiResponse({ status: 200, description: 'Survey retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  async findOne(@Param('id') id: string, @CurrentUser() user) {
    return this.surveysService.findOne(id, user.organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete survey' })
  @ApiResponse({ status: 200, description: 'Survey deleted successfully' })
  @ApiResponse({ status: 404, description: 'Survey not found' })
  async remove(@Param('id') id: string, @CurrentUser() user) {
    await this.surveysService.remove(id, user.organizationId);
    return { message: 'Survey deleted successfully' };
  }
}
