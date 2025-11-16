import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Field } from './field.entity';
import { CreateFieldDto } from './dto/create-field.dto';
import { UpdateFieldDto } from './dto/update-field.dto';

/**
 * Fields service implements business logic for field management.
 *
 * All queries are scoped by organizationId for multi-tenancy isolation.
 */
@Injectable()
export class FieldsService {
  constructor(
    @InjectRepository(Field)
    private fieldsRepository: Repository<Field>
  ) {}

  async findAll(organizationId: string, filters: { municipality?: string; cropType?: string }) {
    const query = this.fieldsRepository
      .createQueryBuilder('field')
      .where('field.organizationId = :organizationId', { organizationId });

    if (filters.municipality) {
      query.andWhere('field.municipality = :municipality', {
        municipality: filters.municipality,
      });
    }

    if (filters.cropType) {
      query.andWhere('field.cropType = :cropType', { cropType: filters.cropType });
    }

    return query.getMany();
  }

  async findOne(id: string, organizationId: string): Promise<Field> {
    const field = await this.fieldsRepository.findOne({
      where: { id, organizationId },
    });

    if (!field) {
      throw new NotFoundException(`Field with ID ${id} not found`);
    }

    return field;
  }

  async create(createFieldDto: CreateFieldDto, organizationId: string): Promise<Field> {
    const field = this.fieldsRepository.create({
      ...createFieldDto,
      organizationId,
    });

    return this.fieldsRepository.save(field);
  }

  async update(
    id: string,
    updateFieldDto: UpdateFieldDto,
    organizationId: string
  ): Promise<Field> {
    const field = await this.findOne(id, organizationId);
    Object.assign(field, updateFieldDto);
    return this.fieldsRepository.save(field);
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const field = await this.findOne(id, organizationId);
    await this.fieldsRepository.remove(field);
  }

  /**
   * Calculate total area using PostGIS ST_Area.
   */
  async getTotalArea(organizationId: string): Promise<{ totalHectares: number }> {
    const result = await this.fieldsRepository
      .createQueryBuilder('field')
      .select('SUM(field.areaHectares)', 'totalHectares')
      .where('field.organizationId = :organizationId', { organizationId })
      .getRawOne();

    return { totalHectares: parseFloat(result.totalHectares) || 0 };
  }
}
