import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkQueueItem, SavedView } from './entities';
import { WorkQueueController } from './work-queue.controller';
import { WorkQueueInternalController } from './work-queue.internal.controller';
import { SavedViewController } from './saved-view.controller';
import { WorkQueueService } from './work-queue.service';
import { PrioritizationService } from './services/prioritization.service';
import { SavedViewService } from './services/saved-view.service';
import { PerformanceModule } from '../performance/performance.module';
import { NotificationModule } from '../notifications/notifications.module';
import {
  DebtCreatedListener,
  PaymentReceivedListener,
  ContactAttemptedListener,
  TaskCreatedListener,
  PriorityUpdatedListener,
} from './listeners';
import { WorkQueueItemAssignedFromAutomationsListener } from './listeners/work-queue-item-assigned-from-automations.listener';
import { AssignmentRegistryModule } from '../assignments/assignment-registry.module';

if (!process.env.PUBSUB_PROJECT_ID) {
  throw new Error('PUBSUB_PROJECT_ID environment variable is not set.');
}

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkQueueItem, SavedView]),
    PerformanceModule,
    NotificationModule,
    AssignmentRegistryModule,
  ],
  controllers: [
    WorkQueueController,
    WorkQueueInternalController,
    SavedViewController,
  ],
  providers: [
    WorkQueueService,
    PrioritizationService,
    SavedViewService,
    DebtCreatedListener,
    PaymentReceivedListener,
    ContactAttemptedListener,
    TaskCreatedListener,
    PriorityUpdatedListener,
    WorkQueueItemAssignedFromAutomationsListener,
  ],
  exports: [WorkQueueService, PrioritizationService, SavedViewService],
})
export class WorkQueueModule {}
