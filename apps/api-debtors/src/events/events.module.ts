import { Module, Global } from '@nestjs/common';
import { EventPublisherModule } from '@verichron/event-publisher';
import { EventSubscriberModule } from '@verichron/event-subscriber';
import { EVENT_SOURCES } from '@verichron/events';


if (!process.env.PUBSUB_PROJECT_ID) {
  throw new Error('PUBSUB_PROJECT_ID environment variable is not set.');
}

/**
 * ============================================================================
 * EVENTS MODULE - Infrastructure Bridge Pattern (Global)
 * ============================================================================
 * 
 * Provides global event infrastructure (Publisher, Subscriber).
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
      serviceName: EVENT_SOURCES.DEBTORS,
    }),
    EventSubscriberModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.DEBTORS,
    }),
  ],
  providers: [],
  exports: [EventPublisherModule, EventSubscriberModule],
})
export class EventsModule {}