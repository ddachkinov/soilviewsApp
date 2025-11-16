import { Module } from '@nestjs/common';
import { SentinelHubService } from './sentinel-hub.service';

@Module({
  providers: [SentinelHubService],
  exports: [SentinelHubService],
})
export class SentinelHubModule {}
