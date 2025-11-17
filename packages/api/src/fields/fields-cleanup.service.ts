import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FieldsService } from './fields.service';

/**
 * Automated cleanup service for temporary fields.
 * Removes expired temporary fields to maintain database hygiene.
 */
@Injectable()
export class FieldsCleanupService {
  private readonly logger = new Logger(FieldsCleanupService.name);

  constructor(private readonly fieldsService: FieldsService) {}

  /**
   * Scheduled job to clean up expired temporary fields.
   * Runs daily at 3 AM.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredTemporaryFields(): Promise<void> {
    this.logger.log('Starting cleanup of expired temporary fields');

    try {
      const result = await this.fieldsService.cleanupExpiredTemporary();

      this.logger.log(
        `Successfully cleaned up ${result.deletedCount} expired temporary fields`
      );
    } catch (error) {
      this.logger.error(
        `Failed to clean up temporary fields: ${error.message}`,
        error.stack
      );
    }
  }
}
