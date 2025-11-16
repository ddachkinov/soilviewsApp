import {
  Controller,
  Post,
  Get,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CadastreService } from './cadastre.service';
import { Field } from '../fields/field.entity';

@ApiTags('cadastre')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cadastre')
export class CadastreController {
  constructor(private readonly cadastreService: CadastreService) {}

  @Post('import')
  @ApiOperation({ summary: 'Import fields from KAIS cadastre shapefile' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Fields imported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid shapefile or missing required files' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'shp', maxCount: 1 },
      { name: 'dbf', maxCount: 1 },
      { name: 'shx', maxCount: 1 },
      { name: 'prj', maxCount: 1 },
    ]),
  )
  async importShapefile(
    @UploadedFiles()
    files: {
      shp?: Express.Multer.File[];
      dbf?: Express.Multer.File[];
      shx?: Express.Multer.File[];
      prj?: Express.Multer.File[];
    },
    @Request() req,
  ): Promise<{ count: number; fields: Field[] }> {
    // Validate all required files are present
    if (!files.shp || !files.dbf || !files.shx || !files.prj) {
      throw new BadRequestException(
        'All shapefile components are required: .shp, .dbf, .shx, .prj',
      );
    }

    const shpBuffer = files.shp[0].buffer;
    const dbfBuffer = files.dbf[0].buffer;

    return this.cadastreService.importShapefile(shpBuffer, dbfBuffer, req.user.organizationId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search field by KAIS cadastre ID' })
  @ApiResponse({ status: 200, description: 'Field found', type: Field })
  @ApiResponse({ status: 404, description: 'Field not found' })
  @ApiResponse({ status: 400, description: 'Invalid cadastre ID format' })
  async searchByCadastreId(
    @Query('cadastreId') cadastreId: string,
    @Request() req,
  ): Promise<Field | null> {
    if (!cadastreId) {
      throw new BadRequestException('Cadastre ID is required');
    }

    return this.cadastreService.searchByCadastreId(cadastreId, req.user.organizationId);
  }

  @Get('search/ekatte')
  @ApiOperation({ summary: 'Search fields by EKATTE municipality code' })
  @ApiResponse({ status: 200, description: 'Fields found', type: [Field] })
  @ApiResponse({ status: 400, description: 'Invalid EKATTE code' })
  async searchByEkatte(@Query('ekatte') ekatte: string, @Request() req): Promise<Field[]> {
    if (!ekatte) {
      throw new BadRequestException('EKATTE code is required');
    }

    if (!/^\d{5}$/.test(ekatte)) {
      throw new BadRequestException('Invalid EKATTE code format. Expected 5 digits.');
    }

    return this.cadastreService.searchByEkatte(ekatte, req.user.organizationId);
  }

  @Get('validate')
  @ApiOperation({ summary: 'Validate cadastre ID format' })
  @ApiResponse({ status: 200, description: 'Validation result' })
  async validateCadastreId(@Query('cadastreId') cadastreId: string): Promise<{ valid: boolean }> {
    if (!cadastreId) {
      throw new BadRequestException('Cadastre ID is required');
    }

    const valid = this.cadastreService.validateCadastreId(cadastreId);
    return { valid };
  }
}
