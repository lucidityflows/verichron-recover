import { Injectable, Logger, Inject, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, Reflector, MetadataScanner } from '@nestjs/core';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { EventEnvelope, OrchestrationEventEnvelope } from '@verichron/events';
import { EventSubscriber } from './event-subscriber.service';
import {
  EVENT_SUBSCRIBER_METADATA_KEY,
  EventSubscriptionOptions,
} from './decorators/event-subscription.decorator';
import { AbstractBaseListener } from './base-listener.abstract';
import { EventSubscriberConfig } from './event-subscriber.module';


@Injectable()
export class SubscriberDiscoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SubscriberDiscoveryService.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly pubsubService: EventSubscriber,
    @Inject('EVENT_SUBSCRIBER_CONFIG')
    private readonly config: EventSubscriberConfig,
  ) {}

  // Changed from onModuleInit to onApplicationBootstrap
  // This ensures all modules are fully initialized before discovery
  async onApplicationBootstrap() {
    try {
      await this.discoverAndRegisterSubscribers();
    } catch (error: any) {
      this.logger.error(
        'Failed to register subscribers during application bootstrap',
        error.stack,
      );
      // Re-throw to prevent app from starting with broken subscribers
      throw error;
    }
  }

  async discoverAndRegisterSubscribers() {
    const providers: InstanceWrapper[] = this.discoveryService.getProviders();

    const registrations: Promise<void>[] = [];
    let skippedCount = 0;
    let scannedCount = 0;

    for (const wrapper of providers) {
      // Skip if wrapper doesn't have a metatype or is an alias
      if (!wrapper.metatype || wrapper.isAlias) {
        continue;
      }

      try {
        const className = wrapper.metatype?.name || 'Unknown';

        // At onApplicationBootstrap stage, wrapper.instance should have all dependencies injected
        // We can use it directly since DI is complete
        const instance = wrapper.instance;

        if (!instance) {
          // Log if a listener has no instance (might be REQUEST-scoped)
          if (className.includes('Listener')) {
            this.logger.debug(
              `Skipping ${className}: wrapper.instance is ${instance === null ? 'null' : 'undefined'}`
            );
          }
          continue;
        }

        if (!Object.getPrototypeOf(instance)) {
          continue;
        }

        scannedCount++;

        // Scan the instance for @EventSubscription decorated methods
        this.metadataScanner.scanFromPrototype(
          instance,
          Object.getPrototypeOf(instance),
          (methodName: string) => {
            const subscriberPromise = this.registerIfSubscriber(instance, methodName);
            if (subscriberPromise) registrations.push(subscriberPromise);
          },
        );
      } catch (error) {
        skippedCount++;
        // Log if this looks like a listener class being skipped
        const className = wrapper.metatype?.name || 'Unknown';
        if (className.includes('Listener')) {
          this.logger.warn(
            `Failed to scan ${className}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
        // Provider not ready - skip it
        continue;
      }
    }

    this.logger.log(`Scanned ${scannedCount} providers, skipped ${skippedCount}`);

    // Wait for all registrations in parallel
    try {
      await Promise.all(registrations);
      this.logger.log('All event subscribers registered successfully');
    } catch (error) {
      this.logger.error('Some subscribers failed to register', error);
      // Don't throw - let app continue
    }
  }

  private async registerIfSubscriber(
    instance: any,
    methodName: string,
  ): Promise<void> {
    const metadata: EventSubscriptionOptions = this.reflector.get(
      EVENT_SUBSCRIBER_METADATA_KEY,
      instance[methodName],
    );

    if (!metadata) {
      return;
    }

    try {
      const { topicName, eventType } = metadata;

      // Auto-generate subscription name if not provided:
      // Pattern: [service-name].[event-type].sub
      // Each eventType is unique, ensuring unique subscription names
      const subscriptionName = metadata.subscriptionName ||
        (eventType
          ? `${this.config.serviceName}.${eventType}.sub`
          : `${this.config.serviceName}.${topicName}.${methodName}.sub`);

      const topic = this.pubsubService.getTopic(topicName);
      const subscription = await this.pubsubService.getSubscription(
        topic,
        subscriptionName,
      );

      this.logger.log(
        `Registering subscriber for topic '${topicName}' on subscription '${subscriptionName}'`,
      );

      subscription.on('message', async (message) => {
        try {
          this.logger.debug(`[SubscriberDiscoveryService] Raw message attributes: ${JSON.stringify(message.attributes)}`);
          const envelope: EventEnvelope<unknown> = JSON.parse(message.data.toString());

          // Augment envelope with Pub/Sub message attributes for orchestration, or from data if attributes are missing
          if (message.attributes?.correlationId) {
            envelope.correlationId = message.attributes.correlationId;
          } else if ((envelope.data as any)?.correlationId) { // Type assertion for safe access
            envelope.correlationId = (envelope.data as any).correlationId;
          }

          if (message.attributes?.replyTo) {
            (envelope as OrchestrationEventEnvelope).replyTo = message.attributes.replyTo;
          } else if ((envelope.data as any)?.replyTo) { // Type assertion for safe access
            (envelope as OrchestrationEventEnvelope).replyTo = (envelope.data as any).replyTo;
          }

          // Filter by eventType if specified in decorator
          if (metadata.eventType) {
            const allowedTypes = Array.isArray(metadata.eventType)
              ? metadata.eventType
              : [metadata.eventType];

            if (!allowedTypes.includes(envelope.eventType)) {
              // Not for this handler - acknowledge and skip
              message.ack();
              return;
            }
          }

          // Route through AbstractBaseListener flow if applicable, otherwise call method directly
          if (instance instanceof AbstractBaseListener) {
            // Extract DTO class from metadata for validation and transformation
            const dtoClass = metadata.dto;

            if (!dtoClass) {
              throw new Error(
                `Configuration Error: DTO class not found in metadata for ${instance.constructor.name}.${methodName}. ` +
                `Ensure @EventSubscription decorator includes 'dto' property.`
              );
            }

            await instance.__executeStandardizedFlow(envelope as any, methodName, dtoClass);
          } else {
            await instance[methodName].call(instance, envelope);
          }
          
          message.ack();
        } catch (error) {
          if (error instanceof Error) {
            this.logger.error(
              `Error processing message from topic '${topicName}': ${error.message}`,
              error.stack,
            );
          } else {
            this.logger.error(
              `An unknown error occurred while processing message from topic '${topicName}'`,
              error,
            );
          }
          message.nack();
        }
      });

      subscription.on('error', (error) => {
        this.logger.error(
          `Subscription error on '${subscriptionName}': ${error.message}`,
          error.stack,
        );
      });
    } catch (error) {
      this.logger.error(
        `Failed to register subscriber for ${methodName}`,
        error,
      );
      // Don't throw - continue with other subscribers
    }
  }

}