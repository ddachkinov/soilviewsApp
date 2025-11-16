import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { CadastreService } from './cadastre.service';
import { CadastreController } from './cadastre.controller';
import { CadastreSyncService } from './cadastre-sync.service';
import { Field } from '../fields/field.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Field]),
    ScheduleModule.forRoot(), // Enable scheduled tasks
  ],
  controllers: [CadastreController],
  providers: [CadastreService, CadastreSyncService],
  exports: [CadastreService],
})
export class CadastreModule {}
