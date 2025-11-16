import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { MapsService } from './maps.service';
import { MapsController } from './maps.controller';
import { MapGenerationProcessor } from './processors/map-generation.processor';
import { Map } from './map.entity';
import { Field } from '../fields/field.entity';
import { SentinelHubModule } from '../sentinel-hub/sentinel-hub.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Map, Field]),
    BullModule.registerQueue({
      name: 'map-generation',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 25s, 125s
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
    SentinelHubModule,
  ],
  controllers: [MapsController],
  providers: [MapsService, MapGenerationProcessor],
  exports: [MapsService],
})
export class MapsModule {}
