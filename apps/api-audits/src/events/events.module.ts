import { Module, Global } from '@nestjs/common';
import { EventPublisherModule } from '@verichron/event-publisher';
import { EventSubscriberModule } from '@verichron/event-subscriber';
import { EVENT_SOURCES } from '@verichron/events';

if (!process.env.PUBSUB_PROJECT_ID) {
  throw new Error('PUBSUB_PROJECT_ID environment variable is not set.');
}

/**
 * ============================================================================
 * EVENTS MODULE - Infrastructure Bridge Pattern
 * ============================================================================
 * 
 * Provides global event infrastructure (Publisher & Subscriber) for api-audits.
 * 
 * api-audits is primarily a SUBSCRIBER (listening to everything), 
 * but may publish its own lifecycle events or reports.
 */
@Global()
@Module({
  imports: [
    EventPublisherModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.AUDITS,
    }),
    EventSubscriberModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.AUDITS,
    }),
  ],
  exports: [EventPublisherModule, EventSubscriberModule],
})
export class EventsModule {}
