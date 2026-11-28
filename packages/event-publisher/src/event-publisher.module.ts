import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventSource } from '@verichron/events';
import { EventPublisher } from './event-publisher.service';

export interface EventPublisherConfig {
  projectId: string;
  keyFilename?: string;
  emulatorHost?: string;
  serviceName?: EventSource;
}

/**
 * Event Publisher Module
 *
 * Provides EventPublisher service for publishing domain events to GCP Pub/Sub.
 *
 * This module is marked as @Global() for convenience, making EventPublisher
 * available throughout your application without needing to import the module
 * in every feature module.
 *
 * @example
 * ```typescript
 * // In your AppModule
 * import { EventPublisherModule } from '@verichron/event-publisher';
 *
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot(),
 *     EventPublisherModule.forRoot({
 *       projectId: process.env.PUBSUB_PROJECT_ID,
 *       emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
 *       serviceName: 'api-your-service',
 *     }),
 *     // ... other modules
 *   ],
 * })
 * export class AppModule {}
 *
 * // In any service
 * @Injectable()
 * export class YourService {
 *   constructor(private readonly eventPublisher: EventPublisher) {}
 *
 *   async doSomething() {
 *     await this.eventPublisher.publish(
 *       'your-service-v1',
 *       'your-service.event.type',
 *       'api-your-service',
 *       { ...data }
 *     );
 *   }
 * }
 * ```
 */
@Global()
@Module({}) // Remove imports from here, they will be in forRoot
export class EventPublisherModule {
  static forRoot(config: EventPublisherConfig): DynamicModule {
    const configProvider: Provider = {
      provide: 'EVENT_PUBLISHER_CONFIG',
      useValue: config,
    };

    return {
      global: true,
      module: EventPublisherModule,
      imports: [ConfigModule], // Import ConfigModule here
      providers: [
        configProvider,
        EventPublisher,
      ],
      exports: [EventPublisher],
    };
  }
}
