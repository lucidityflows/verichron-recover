import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import { PubSub, Subscription, Topic } from '@google-cloud/pubsub';
import type { EventSubscriberConfig } from './event-subscriber.module';

/**
 * GCP PubSub Service (Subscriber)
 * 
 * Handles ONLY subscription-related operations for listening to events.
 * Publishing functionality has been moved to packages/event-publisher.
 * 
 * Responsibilities:
 * - Managing PubSub client lifecycle
 * - Creating/retrieving topics for subscription
 * - Creating/retrieving subscriptions
 * - Managing subscription lifecycle
 * 
 * NOT responsible for:
 * - Publishing messages (use EventPublisher from packages/event-publisher)
 */
@Injectable()
export class EventSubscriber implements OnModuleDestroy {
  private readonly pubsub: PubSub;
  private readonly logger = new Logger(EventSubscriber.name);
  private readonly subscriptions: Subscription[] = [];

  constructor(
    @Inject('EVENT_SUBSCRIBER_CONFIG')
    private readonly config: EventSubscriberConfig,
  ) {
    this.pubsub = new PubSub({
      projectId: config.projectId,
      // Configure for optimal subscription performance
      // timeout: 10000, // 10 seconds
    });
    
    this.logger.log(`PubSub subscriber initialized for project: ${config.projectId}`);
  }

  /**
   * Cleanup on module destruction
   * Closes all active subscriptions and the PubSub client
   */
  async onModuleDestroy() {
    try {
      // Close all active subscriptions
      await Promise.all(
        this.subscriptions.map(async (subscription) => {
          try {
            await subscription.close();
            this.logger.log(`Closed subscription: ${subscription.name}`);
          } catch (error) {
            this.logger.error(
              `Error closing subscription ${subscription.name}`,
              error,
            );
          }
        }),
      );

      // Close the PubSub client
      await this.pubsub.close();
      this.logger.log('PubSub client closed successfully');
    } catch (error) {
      this.logger.error('Error during PubSub cleanup', error);
    }
  }

  /**
   * Get a topic reference for subscription purposes
   * 
   * @param topicName Name of the topic
   * @returns Topic reference
   */
  getTopic(topicName: string): Topic {
    return this.pubsub.topic(topicName);
  }

  /**
   * Get or create a subscription for a topic
   * 
   * If the subscription doesn't exist, it will be created automatically.
   * Subscriptions are tracked for lifecycle management.
   * 
   * @param topic Topic to subscribe to
   * @param subscriptionName Name for the subscription
   * @returns Active subscription
   */
  async getSubscription(
    topic: Topic,
    subscriptionName: string,
  ): Promise<Subscription> {
    try {
      const subscription = this.pubsub.subscription(subscriptionName);
      const [exists] = await subscription.exists();

      if (!exists) {
        this.logger.log(
          `Creating subscription: ${subscriptionName} for topic: ${topic.name}`,
        );
        
        // Create subscription with sensible defaults
        const [newSubscription] = await topic.createSubscription(subscriptionName, {
          // Configure ack deadline (how long subscriber has to process before redelivery)
          ackDeadlineSeconds: 60,
          // Configure message retention (how long undelivered messages are kept)
          messageRetentionDuration: {
            seconds: 604800, // 7 days
          },
          // Enable exactly-once delivery if needed
          // enableExactlyOnceDelivery: true,
        });

        // Track subscription for cleanup
        this.subscriptions.push(newSubscription);
        
        return newSubscription;
      }

      // Track existing subscription for cleanup
      if (!this.subscriptions.includes(subscription)) {
        this.subscriptions.push(subscription);
      }

      this.logger.log(`Using existing subscription: ${subscriptionName}`);
      return subscription;
    } catch (error) {
      this.logger.error(
        `Failed to get/create subscription ${subscriptionName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get the PubSub client instance
   * Exposed for advanced use cases, but generally not needed
   * 
   * @returns PubSub client
   */
  getClient(): PubSub {
    return this.pubsub;
  }
}