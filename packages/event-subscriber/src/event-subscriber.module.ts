
import { Module, DynamicModule, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { EventSource } from '@verichron/events';

import { EventSubscriber } from './event-subscriber.service';
import { SubscriberDiscoveryService } from './subscriber-discovery.service';

/**
 * Event Subscriber Configuration
 * 
 * Configuration options for the event subscriber system.
 */
export interface EventSubscriberConfig {
  /**
   * GCP Project ID
   */
  projectId: string;

  /**
   * Service name for this subscriber instance (e.g., 'api-users')
   * Used for automated subscription naming to ensure unique queues per service.
   */
  serviceName: EventSource;

  /**
   * Optional: Custom credentials path
   * If not provided, uses default GCP authentication
   */
  keyFilename?: string;

  /**
   * Optional: Emulator host for local development
   * Example: 'localhost:8085'
   */
  emulatorHost?: string;
}

/**
 * Event Subscriber Module
 * 
 * Provides event subscription capabilities using GCP Pub/Sub.
 * This module is responsible ONLY for listening to events, not publishing them.
 * 
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [
 *     EventSubscriberModule.forRoot({
 *       projectId: process.env.GCP_PROJECT_ID || 'local-dev',
 *       emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 * 
 * Then in your services:
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   @EventSubscriber({
 *     topicName: 'my-topic',
 *     subscriptionName: 'my-service-subscription',
 *   })
 *   async handleEvent(payload: MyEventPayload) {
 *     // Process event
 *   }
 * }
 * ```
 */
@Module({
  imports: [DiscoveryModule],
})
export class EventSubscriberModule {
  /**
   * Configure the event subscriber module with GCP Pub/Sub settings
   * 
   * @param config Subscriber configuration
   * @returns Configured dynamic module
   */
  static forRoot(config: EventSubscriberConfig): DynamicModule {
    const configProvider: Provider = {
      provide: 'EVENT_SUBSCRIBER_CONFIG',
      useValue: config,
    };

    return {
      global: true,
      module: EventSubscriberModule,
      providers: [configProvider, EventSubscriber, SubscriberDiscoveryService],
      exports: [EventSubscriber], // Export for advanced use cases
    };
  }
}