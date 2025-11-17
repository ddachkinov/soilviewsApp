import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Field } from './field.entity';
import { FieldsController } from './fields.controller';
import { FieldsService } from './fields.service';
import { FieldsCleanupService } from './fields-cleanup.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Field]),
    ScheduleModule.forRoot(),
  ],
  controllers: [FieldsController],
  providers: [FieldsService, FieldsCleanupService],
  exports: [FieldsService],
})
export class FieldsModule {}
