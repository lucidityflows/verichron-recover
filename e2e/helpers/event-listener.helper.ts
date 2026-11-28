import { Test, TestingModule } from '@nestjs/testing';
import { EventPublisherModule } from '@verichron/event-publisher';
import { EventSubscriberModule } from '@verichron/event-subscriber';
import { EventSubscriber } from '@verichron/event-subscriber';
import { Subscription, Message } from '@google-cloud/pubsub';
import { Logger } from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { 
  EventEnvelope,
  EventType,
  EventTopic,
  EVENT_SOURCES,
} from '@verichron/events'; 

export interface CapturedEvent<T = any> {
  eventId: string;
  eventType: EventType;
  topic: EventTopic;
  payload: T;
  timestamp: Date;
  messageId: string;
  correlationId?: string;
  attributes: Record<string, string>;
}

export class EventListenerHelper {
  private subscriptions: Map<string, Subscription> = new Map();
  private capturedEvents: CapturedEvent[] = [];
  private eventPromises: Map<string, Array<{ 
    resolve: (event: CapturedEvent) => void; 
    reject: (error: Error) => void; 
    predicate?: (event: CapturedEvent) => boolean; 
    timeout: NodeJS.Timeout; 
  }>> = new Map();
  private readonly logger = new Logger(EventListenerHelper.name);
  private dtoMap: Map<EventType, any> = new Map();

  constructor(
    private readonly eventSubscriber: EventSubscriber,
  ) {}


  registerDtoMapping(eventType: EventType, dto: any): void {
    this.dtoMap.set(eventType, dto);
  }

  /**
   * Start listening to a topic
   */
  async startListening(topicName: EventTopic, subscriptionName?: string): Promise<void> {
    const subName = subscriptionName || `e2e-test-sub-${topicName}-${Date.now()}`;
    
    try {
      const topic = this.eventSubscriber.getTopic(topicName);
      const subscription = await this.eventSubscriber.getSubscription(topic, subName);

      subscription.on('message', async (message: Message) => {
        await this.handleMessage(topicName, message);
        await message.ack();
      });

      subscription.on('error', (error: any) => {
        console.error(`❌ Subscription error for ${topicName}:`, error);
      });

      this.subscriptions.set(topicName, subscription);
      
      // Wait for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Failed to start listening to ${topicName}:`, error);
      throw error;
    }
  }

  /**
   * Check if a topic exists in Pub/Sub.
   */
  async topicExists(topicName: string): Promise<boolean> {
    try {
      const topic = this.eventSubscriber.getClient().topic(topicName);
      const [exists] = await topic.exists();
      return exists;
    } catch (error) {
      this.logger.error(`Error checking if topic ${topicName} exists:`, error);
      return false;
    }
  }

  /**
   * Create a topic if it doesn't exist.
   */
  async ensureTopic(topicName: string): Promise<void> {
    try {
      const exists = await this.topicExists(topicName);
      if (!exists) {
        await this.eventSubscriber.getClient().createTopic(topicName);
        this.logger.log(`Created topic: ${topicName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create topic ${topicName}:`, error);
      throw error;
    }
  }

  async ensureSubscriptionExists(topicName: EventTopic, subscriptionName: string): Promise<void> {
    try {
      await this.ensureTopic(topicName);
      const topic = this.eventSubscriber.getTopic(topicName);
      const subscription = this.eventSubscriber.getClient().subscription(subscriptionName);
      const [exists] = await subscription.exists();
      if (!exists) {
        await topic.createSubscription(subscriptionName);
        this.logger.log(`Created subscription: ${subscriptionName}`);
      }
      console.log(`✅ Subscription '${subscriptionName}' on topic '${topicName}' is ready.`);
    } catch (error) {
      console.error(`❌ Failed to ensure subscription '${subscriptionName}' on topic '${topicName}':`, error);
      throw error;
    }
  }

  private async handleMessage(topicName: string, message: Message): Promise<void> {
    try {
      const dataString = message.data.toString();
      const envelope: EventEnvelope = JSON.parse(dataString);

      const dtoClass = this.dtoMap.get(envelope.eventType as EventType);
      let payload: any = envelope.data;

      if (dtoClass) {
        const dto = plainToClass(dtoClass, envelope.data as object);
        const errors = await validate(dto as object);

        if (errors.length > 0) {
          this.logger.error(`❌ Event DTO validation failed for ${envelope.eventType}:`, errors);
          // Optionally, reject promises waiting for this event
          return;
        }
        payload = dto;
      }

      const event: CapturedEvent = {
        eventId: envelope.eventId,
        eventType: envelope.eventType as EventType,
        topic: topicName as EventTopic,
        payload: payload,
        timestamp: new Date(envelope.timestamp),
        messageId: message.id,
        correlationId: envelope.correlationId,
        attributes: message.attributes,
      };

      this.capturedEvents.push(event);
      this.resolveWaitingPromises(event);
      
    } catch (error) {
      console.error('Failed to parse message:', error);
      console.error('Raw message:', message.data.toString());
    }
  }

  /**
   * Resolve promises waiting for specific events
   */
  private resolveWaitingPromises(event: CapturedEvent): void {
    const waiters = this.eventPromises.get(event.eventType);
    
    if (!waiters || waiters.length === 0) {
      return;
    }

    const matchingWaiters = waiters.filter(waiter => 
      !waiter.predicate || waiter.predicate(event)
    );

    matchingWaiters.forEach(waiter => {
      clearTimeout(waiter.timeout);
      waiter.resolve(event);
    });

    const remainingWaiters = waiters.filter(w => !matchingWaiters.includes(w));
    if (remainingWaiters.length > 0) {
      this.eventPromises.set(event.eventType, remainingWaiters);
    } else {
      this.eventPromises.delete(event.eventType);
    }
  }

  /**
   * Wait for a specific event
   */
  async waitForEvent(
    eventType: EventType,
    options: {
      timeout?: number;
      predicate?: (event: CapturedEvent) => boolean;
      correlationId?: string;
    } = {}
  ): Promise<CapturedEvent> {
    const { timeout = 10000, predicate, correlationId } = options;

    const finalPredicate = (event: CapturedEvent): boolean => {
      if (correlationId && event.correlationId !== correlationId) {
        return false;
      }
      if (predicate && !predicate(event)) {
        return false;
      }
      return true;
    };

    const existingEvent = this.capturedEvents.find(e =>
      e.eventType === eventType && finalPredicate(e)
    );
    
    if (existingEvent) {
      return existingEvent;
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.removeWaiter(eventType, resolve);
        
        const summary = this.getEventSummary();
        reject(new Error(
          `❌ Timeout waiting for event: ${eventType}\n` +
          `📊 Captured ${summary.total} events:\n` +
          `${JSON.stringify(summary.byType, null, 2)}`
        ));
      }, timeout);

      if (!this.eventPromises.has(eventType)) {
        this.eventPromises.set(eventType, []);
      }

      this.eventPromises.get(eventType)!.push({
        resolve,
        reject,
        predicate: finalPredicate,
        timeout: timeoutId,
      });
    });
  }

  private removeWaiter(eventType: string, resolve: Function): void {
    const waiters = this.eventPromises.get(eventType);
    if (waiters) {
      const filtered = waiters.filter(w => w.resolve !== resolve);
      if (filtered.length > 0) {
        this.eventPromises.set(eventType, filtered);
      } else {
        this.eventPromises.delete(eventType);
      }
    }
  }

  async stopListening(topicName: string): Promise<void> {
    const subscription = this.subscriptions.get(topicName);
    if (subscription) {
      await subscription.close();
      this.subscriptions.delete(topicName);
    }
  }

  async stopAll(): Promise<void> {
    const promises = Array.from(this.subscriptions.keys()).map(topic =>
      this.stopListening(topic)
    );
    await Promise.all(promises);
    
    this.eventPromises.forEach(waiters => {
      waiters.forEach(waiter => {
        clearTimeout(waiter.timeout);
        waiter.reject(new Error('Event listener stopped'));
      });
    });
    
    this.eventPromises.clear();
    this.capturedEvents = [];
  }

  getAllEvents(): CapturedEvent[] {
    return [...this.capturedEvents];
  }

  getEventsByType(eventType: EventType): CapturedEvent[] {
    return this.capturedEvents.filter(e => e.eventType === eventType);
  }

  getEventsByTopic(topicName: EventTopic): CapturedEvent[] {
    return this.capturedEvents.filter(e => e.topic === topicName);
  }

  async waitForEvents(
    eventTypes: EventType[],
    options: { timeout?: number } = {}
  ): Promise<CapturedEvent[]> {
    const { timeout = 10000 } = options;

    const promises = eventTypes.map(eventType =>
      this.waitForEvent(eventType, { timeout })
    );

    return Promise.all(promises);
  }

  clearEvents(): void {
    this.capturedEvents = [];
  }

  getEventSummary(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    this.capturedEvents.forEach(event => {
      byType[event.eventType] = (byType[event.eventType] || 0) + 1;
    });
    return { total: this.capturedEvents.length, byType };
  }

  printSummary(): void {
    const summary = this.getEventSummary();
    console.log('\n📊 Captured Events Summary:');
    console.log('═'.repeat(60));
    console.log(`Total Events: ${summary.total}`);
    console.log('\nBy Type:');
    Object.entries(summary.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log('═'.repeat(60) + '\n');
  }
}

export async function createEventListenerHelper(): Promise<EventListenerHelper> {
  const projectId = process.env.PUBSUB_PROJECT_ID || 'test-project';
  const emulatorHost = process.env.PUBSUB_EMULATOR_HOST || 'localhost:8085';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      EventPublisherModule.forRoot({
        projectId,
        emulatorHost,
        serviceName: EVENT_SOURCES.TEST,
      }),
      EventSubscriberModule.forRoot({
        projectId,
        emulatorHost,
        serviceName: EVENT_SOURCES.TEST,
      }),
    ],
  }).compile();

  const eventSubscriber = moduleFixture.get<EventSubscriber>(EventSubscriber);

  return new EventListenerHelper(eventSubscriber);
}
