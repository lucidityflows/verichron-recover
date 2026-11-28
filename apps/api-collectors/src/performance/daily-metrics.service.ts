import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { CollectorDailyMetric } from './entities/collector-daily-metric.entity';

@Injectable()
export class DailyMetricsService {
  private readonly logger = new Logger(DailyMetricsService.name);

  constructor(
    @InjectRepository(CollectorDailyMetric)
    private readonly metricRepository: Repository<CollectorDailyMetric>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Increments a specific metric for a collector on a specific date.
   * Uses atomic SQL upsert to ensure consistency under high load.
   */
  async incrementMetric(
    organizationId: string,
    collectorUserId: string,
    metricField: keyof Omit<CollectorDailyMetric, 'id' | 'organizationId' | 'collectorUserId' | 'date' | 'createdAt' | 'updatedAt' | 'totalCollected'>,
    incrementBy = 1,
    date: Date = new Date(),
  ): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];
    const columnName = this.metricRepository.metadata.findColumnWithPropertyName(metricField as string)?.databaseName || metricField;

    try {
      await this.metricRepository
        .createQueryBuilder()
        .insert()
        .into(CollectorDailyMetric)
        .values({
          organizationId,
          collectorUserId,
          date: dateStr,
          [metricField]: incrementBy,
        })
        .onConflict(`("organization_id", "collector_user_id", "date") DO UPDATE SET "${columnName}" = "collector_daily_metrics"."${columnName}" + EXCLUDED."${columnName}"`)
        .execute();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to increment metric ${metricField} for collector ${collectorUserId}: ${message}`);
    }
  }

  /**
   * Specialized method to increment collection totals (cents)
   */
  async addCollection(
    organizationId: string,
    collectorUserId: string,
    amountCents: number,
    date: Date = new Date(),
  ): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];

    try {
      await this.metricRepository
        .createQueryBuilder()
        .insert()
        .into(CollectorDailyMetric)
        .values({
          organizationId,
          collectorUserId,
          date: dateStr,
          paymentsReceived: 1,
          totalCollected: amountCents,
        })
        .onConflict(`("organization_id", "collector_user_id", "date") DO UPDATE SET 
          "payments_received" = "collector_daily_metrics"."payments_received" + EXCLUDED."payments_received",
          "total_collected" = "collector_daily_metrics"."total_collected" + EXCLUDED."total_collected"`)
        .execute();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to add collection for collector ${collectorUserId}: ${message}`);
    }
  }

  /**
   * Retrieves historical metrics for a collector within a date range
   */
  async getHistory(
    organizationId: string,
    collectorUserId: string,
    startDate: string,
    endDate: string,
  ): Promise<CollectorDailyMetric[]> {
    return this.metricRepository.find({
      where: {
        organizationId,
        collectorUserId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });
  }
}
