import { EventEnvelope } from './event-envelope';

/**
 * Standard event envelope for orchestration request events.
 * Includes the `replyTo` topic for the response.
 */
export interface OrchestrationEventEnvelope<T = unknown> extends EventEnvelope<T> {
  /**
   * The topic where the response event should be published.
   */
  replyTo: string;
}
