import { EventType, EventSource } from "../constants";
/**
 * Standard event envelope for all Verichron events
 */
export interface EventEnvelope<T = unknown> {
  /**
   * Unique identifier for this event
   */
  eventId: string;

  /**
   * Type of event (e.g., 'OrganizationStatusUpdated', 'DebtCreated')
   */
  //eventType: string;
  eventType: EventType;

  /**
   * Source service that emitted the event (e.g., 'api-organizations', 'api-debts')
   */
  eventSource: EventSource;

  /**
   * ISO 8601 timestamp when the event occurred
   */
  timestamp: string;

  /**
   * Optional correlation ID for tracing related events
   */
  correlationId?: string;

  /**
   * Event-specific payload data
   */
  data: T;
}
