import { SetMetadata } from '@nestjs/common';
import { type EventTopic, type EventType } from '@verichron/events';

export const EVENT_SUBSCRIBER_METADATA_KEY = 'verichron:event_subscriber';

export interface EventSubscriptionOptions<T = any> {
  /**
   * The topic to subscribe to (type-safe from EVENT_TOPICS)
   */
  topicName: EventTopic;

  /**
   * Optional: Unique subscription name for this handler.
   * If omitted, one will be generated automatically using the pattern:
   * [service-name].[topic-name].[method-name].sub
   */
  subscriptionName?: string;

  /**
   * Optional: Filter to only receive specific event type(s)
   * If not specified, all events on the topic will be received
   */
  eventType?: EventType | EventType[];

  /**
   * DTO class for event data validation and transformation.
   * This class will be used by class-transformer and class-validator
   * to ensure type safety and data validation at runtime.
   *
   * @required This is mandatory for all event subscriptions
   */
  dto: new () => T;
}

export const EventSubscription = <T = any>(options: EventSubscriptionOptions<T>): MethodDecorator =>
  SetMetadata<string, EventSubscriptionOptions<T>>(EVENT_SUBSCRIBER_METADATA_KEY, options);
