import { Module, Global } from '@nestjs/common';
import { EventPublisherModule } from '@verichron/event-publisher';
import { EventSubscriberModule } from '@verichron/event-subscriber';
import { EventOrchestratorModule, CollectorsDataOrchestrator, WorkQueueDataOrchestrator } from '@verichron/event-orchestrator';
import { EVENT_SOURCES } from '@verichron/events';

if (!process.env.PUBSUB_PROJECT_ID) {
  throw new Error('PUBSUB_PROJECT_ID environment variable is not set.');
}

/**
 * ============================================================================
 * EVENTS MODULE - Infrastructure Bridge Pattern
 * ============================================================================
 * 
 * Provides global event infrastructure (Publisher, Subscriber, Orchestrator).
 * 
 * NOTE: To maintain clean DI, do NOT add feature-specific listeners or 
 * repositories here. Register listeners in their respective feature modules.
 */
@Global()
@Module({
  imports: [
    EventPublisherModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.COLLECTORS,
    }),
    EventSubscriberModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.COLLECTORS,
    }),
    EventOrchestratorModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.COLLECTORS,
      serviceEndpoints: {
        'api-organizations': process.env.API_ORGANIZATIONS_URL || 'http://localhost:3002',
        'api-users': process.env.API_USERS_URL || 'http://localhost:3001',
        'api-debts': process.env.API_DEBTS_URL || 'http://localhost:3003',
        'api-transactions': process.env.API_TRANSACTIONS_URL || 'http://localhost:3005',
        'api-debtors': process.env.API_DEBTORS_URL || 'http://localhost:3004',
        'api-communications': process.env.API_COMMUNICATIONS_URL || 'http://localhost:3006',
        'api-collectors': process.env.API_COLLECTORS_URL || 'http://localhost:3007',
        'api-voice': process.env.API_VOICE_URL || 'http://localhost:3008',
        'api-workflows': process.env.API_WORKFLOWS_URL || 'http://localhost:3009',
        'api-automations': process.env.API_AUTOMATIONS_URL || 'http://localhost:3010',
      },
    }),
  ],
  providers: [
    CollectorsDataOrchestrator,
    WorkQueueDataOrchestrator,
  ],
  exports: [EventPublisherModule, EventSubscriberModule, EventOrchestratorModule],
})
export class EventsModule {}