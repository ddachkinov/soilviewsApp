import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionGenerationProcessor } from './processors/prescription-generation.processor';
import { Prescription } from './prescription.entity';
import { Field } from '../fields/field.entity';
import { Map } from '../maps/map.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Prescription, Field, Map]),
    BullModule.registerQueue({
      name: 'prescription-generation',
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: 50,
        removeOnFail: 200,
      },
    }),
  ],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, PrescriptionGenerationProcessor],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
