import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import { PubSub, Topic } from '@google-cloud/pubsub';
import { randomUUID } from 'crypto';
import { EventEnvelope, EventType, EventSource, EVENT_TOPICS } from '@verichron/events';
import type { EventPublisherConfig } from './event-publisher.module';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

/**
 * GCP PubSub Publisher Service
 *
 * Refined for Verichron Gold Standard:
 * 1. Mandatory Outgoing Validation (Fail-Fast)
 * 2. Zero-Boilerplate Defaults (Source & Topic)
 * 3. Support for Correlation Context
 */
@Injectable()
export class EventPublisher implements OnModuleDestroy {
  private readonly pubsub: PubSub;
  private readonly logger = new Logger(EventPublisher.name);
  private readonly topicCache: Map<string, Topic> = new Map();
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000;

  constructor(
    @Inject('EVENT_PUBLISHER_CONFIG')
    private readonly config: EventPublisherConfig,
  ) {
    this.pubsub = new PubSub({
      projectId: config.projectId,
      keyFilename: config.keyFilename,
    });

    if (config.emulatorHost) {
      process.env.PUBSUB_EMULATOR_HOST = config.emulatorHost;
      this.logger.log(`Using PubSub emulator: ${config.emulatorHost}`);
    }

    this.logger.log(`PubSub publisher initialized for ${config.serviceName} in project: ${config.projectId}`);
  }

  async onModuleDestroy() {
    try {
      await this.pubsub.close();
      this.logger.log('PubSub publisher client closed successfully');
    } catch (error) {
      this.logger.error('Error closing PubSub publisher client', error);
    }
  }

  /**
   * Refined Publish Method (Verichron Gold Standard)
   * 
   * 1. Automatically sets eventSource from config.
   * 2. Automatically defaults topic based on service prefix.
   * 3. MANDATES a DTO class for outgoing validation.
   * 
   * @param eventType The standardized event constant
   * @param data The payload object
   * @param dtoClass The class to use for validation
   * @param options Optional overrides (topic, correlationId, attributes)
   */
  async publish<T extends object>(
    eventType: EventType,
    data: T,
    dtoClass: new () => T,
    options?: {
      topic?: string;
      correlationId?: string;
      eventSource?: EventSource;
      attributes?: Record<string, string>;
    },
  ): Promise<string> {
    // 1. Fail-Fast Validation
    const dtoInstance = plainToInstance(dtoClass, data);
    const errors = await validate(dtoInstance);
    
    if (errors.length > 0) {
      this.logger.error(
        `❌ Outgoing event validation FAILED for ${eventType}. ` +
        `Errors: ${JSON.stringify(errors)}`
      );
      throw new Error(`Outgoing event validation failed for ${eventType}`);
    }

    // 2. Resolve Defaults
    const source = options?.eventSource || (this.config.serviceName as EventSource) || 'event-orchestrator';
    const topic = options?.topic || this.getDefaultTopic();

    return this.executeWithRetry(async () => {
      try {
        const event: EventEnvelope<T> = {
          eventId: randomUUID(),
          eventType,
          eventSource: source,
          timestamp: new Date().toISOString(),
          correlationId: options?.correlationId,
          data: dtoInstance,
        };

        const topicRef = await this.getOrCreateTopic(topic);
        const dataBuffer = Buffer.from(JSON.stringify(event), 'utf8');

        const messageId = await topicRef.publishMessage({
          data: dataBuffer,
          attributes: options?.attributes,
        });

        this.logger.log(
          { event },
          `🚀 Published ${eventType} to ${topic} (MsgID: ${messageId}, EvtID: ${event.eventId})`,
        );

        return messageId;
      } catch (error) {
        this.logger.error(`Failed to publish event ${eventType} to topic ${topic}`, error);
        throw error;
      }
    });
  }

  /**
   * Determines the default topic based on the service name.
   * e.g., 'api-users' -> 'users-v1'
   */
  private getDefaultTopic(): string {
    const service = this.config.serviceName;
    if (!service) return 'default-v1';

    const base = service.replace('api-', '').toUpperCase();
    return (EVENT_TOPICS as any)[base] || `${service.replace('api-', '')}-v1`;
  }

  private async getOrCreateTopic(topicName: string): Promise<Topic> {
    if (this.topicCache.has(topicName)) {
      return this.topicCache.get(topicName)!;
    }

    const topic = this.pubsub.topic(topicName);
    try {
      const [exists] = await topic.exists();
      if (!exists) {
        this.logger.log(`Creating topic: ${topicName}`);
        await topic.create();
      }
      this.topicCache.set(topicName, topic);
      return topic;
    } catch (error) {
      this.logger.error(`Failed to get/create topic ${topicName}`, error);
      throw error;
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorCode = (error as any)?.code;
        const isRetryable =
          errorCode === 'UNAVAILABLE' ||
          errorCode === 'DEADLINE_EXCEEDED' ||
          errorCode === 503;

        if (!isRetryable || attempt === this.maxRetries) {
          throw error;
        }
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Transient error publishing message, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }
}
