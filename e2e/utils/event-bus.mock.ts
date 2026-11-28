/**
 * Event Bus Mock
 * In-memory event bus for testing event-driven flows without external dependencies
 */

export interface EventSubscriber {
  topic: string;
  handler: (payload: any) => void | Promise<void>;
}

export class MockEventBus {
  private subscribers: Map<string, EventSubscriber[]> = new Map();
  private publishedEvents: Array<{ topic: string; payload: any; timestamp: Date }> = [];

  /**
   * Subscribe to a topic
   */
  subscribe(topic: string, handler: (payload: any) => void | Promise<void>): void {
    const subscribers = this.subscribers.get(topic) || [];
    subscribers.push({ topic, handler });
    this.subscribers.set(topic, subscribers);
  }

  /**
   * Publish event to topic
   */
  async publish(topic: string, payload: any): Promise<void> {
    // Record the event
    this.publishedEvents.push({
      topic,
      payload,
      timestamp: new Date(),
    });

    // Notify subscribers
    const subscribers = this.subscribers.get(topic) || [];
    for (const subscriber of subscribers) {
      await subscriber.handler(payload);
    }
  }

  /**
   * Get all published events
   */
  getPublishedEvents(): Array<{ topic: string; payload: any; timestamp: Date }> {
    return [...this.publishedEvents];
  }

  /**
   * Get published events for a specific topic
   */
  getPublishedEventsForTopic(topic: string): Array<{ payload: any; timestamp: Date }> {
    return this.publishedEvents
      .filter((event) => event.topic === topic)
      .map((event) => ({ payload: event.payload, timestamp: event.timestamp }));
  }

  /**
   * Get the last published event for a topic
   */
  getLastEventForTopic(topic: string): { payload: any; timestamp: Date } | null {
    const events = this.getPublishedEventsForTopic(topic);
    return events.length > 0 ? events[events.length - 1] : null;
  }

  /**
   * Wait for an event to be published
   */
  async waitForEvent(
    topic: string,
    predicate?: (payload: any) => boolean,
    timeoutMs: number = 5000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for event on topic: ${topic}`));
      }, timeoutMs);

      this.subscribe(topic, (payload) => {
        if (!predicate || predicate(payload)) {
          clearTimeout(timeout);
          resolve(payload);
        }
      });
    });
  }

  /**
   * Clear all published events
   */
  clearPublishedEvents(): void {
    this.publishedEvents = [];
  }

  /**
   * Clear all subscribers
   */
  clearSubscribers(): void {
    this.subscribers.clear();
  }

  /**
   * Reset the mock (clear events and subscribers)
   */
  reset(): void {
    this.clearPublishedEvents();
    this.clearSubscribers();
  }

  /**
   * Get event count for a topic
   */
  getEventCount(topic: string): number {
    return this.getPublishedEventsForTopic(topic).length;
  }

  /**
   * Check if an event was published
   */
  hasEvent(topic: string, predicate?: (payload: any) => boolean): boolean {
    const events = this.getPublishedEventsForTopic(topic);
    if (!predicate) {
      return events.length > 0;
    }
    return events.some((event) => predicate(event.payload));
  }
}

/**
 * Create a new mock event bus
 */
export function createMockEventBus(): MockEventBus {
  return new MockEventBus();
}
