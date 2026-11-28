import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { DailyMetricsService } from './daily-metrics.service';
import { CollectorResponseTrackingService } from './collector-response-tracking.service';
import { CollectorResponseTracking, CollectorDailyMetric } from './entities';
import { WorkQueueItem } from '../work-queue/entities';
import {
  CallbackRequestedListener,
  DebtorContactAttemptedListener,
  EmailReplyReceivedListener,
  PaymentPlanCreatedListener,
  PaymentReceivedListener,
  SmsReplyReceivedListener,
  VerificationRequestedListener,
  WorkQueueItemCompletedListener,
} from './listeners';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollectorResponseTracking,
      CollectorDailyMetric,
      WorkQueueItem,
    ]),
  ],
  controllers: [PerformanceController],
  providers: [
    PerformanceService,
    DailyMetricsService,
    CollectorResponseTrackingService,
    CallbackRequestedListener,
    DebtorContactAttemptedListener,
    EmailReplyReceivedListener,
    PaymentPlanCreatedListener,
    PaymentReceivedListener,
    SmsReplyReceivedListener,
    VerificationRequestedListener,
    WorkQueueItemCompletedListener,
  ],
  exports: [PerformanceService, DailyMetricsService, CollectorResponseTrackingService],
})
export class PerformanceModule {}