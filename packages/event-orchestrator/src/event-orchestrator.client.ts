import { Injectable, Inject, Logger, ServiceUnavailableException } from '@nestjs/common';
import { EventPublisher } from '@verichron/event-publisher';
import { EventSubscriber } from '@verichron/event-subscriber';
import { EventEnvelope, OrchestrationEventEnvelope, EventTopic, EventType, EVENT_TOPICS } from '@verichron/events';
import { v4 as uuidv4 } from 'uuid';
import { EventOrchestratorConfig } from './event-orchestrator.module';

@Injectable()
export class EventOrchestratorClient {
  private readonly logger = new Logger(EventOrchestratorClient.name);
  private readonly pendingRequests = new Map<string, { resolve: (data: any) => void; reject: (error: any) => void; timeout: NodeJS.Timeout }>();
  private readonly responseSubscriptionName: string;
  private isReady = false;
  private setupRetryCount = 0;
  private readonly maxSetupRetries = 3;

  constructor(
    private readonly eventPublisher: EventPublisher,
    private readonly eventSubscriber: EventSubscriber,
    @Inject('EVENT_ORCHESTRATOR_CONFIG') private readonly config: EventOrchestratorConfig,
  ) {
    // Create a unique subscription name for this client instance
    this.responseSubscriptionName = `${this.config.serviceName}-orchestrator-client-response-${uuidv4()}`;
    this.setupResponseListener().catch((error) => {
      // Don't crash on startup - the service can still function without response listening
      // (orchestrations will timeout instead of receiving responses)
      this.logger.error(`EventOrchestratorClient: Initial setup failed, will retry: ${error.message}`);
    });
  }

  private async setupResponseListener(): Promise<void> {
    // Standardize: Orchestration responses always flow through the ORCHESTRATIONS topic
    const responseTopic = this.config.responseTopic || EVENT_TOPICS.ORCHESTRATIONS;

    try {
      const topic = this.eventSubscriber.getTopic(responseTopic);
      const subscription = await this.eventSubscriber.getSubscription(topic, this.responseSubscriptionName);

      subscription.on('message', async (message) => {
        try {
          const attrCorrelationId = message.attributes?.correlationId;
          const attrReplyTo = message.attributes?.replyTo;

          // Optimization 1: If it has a replyTo attribute, it is a REQUEST.
          // Orchestrator clients only care about RESPONSES.
          if (attrReplyTo) {
            message.ack();
            return;
          }

          // Optimization 2: Check correlationId attribute before parsing JSON
          if (!attrCorrelationId || !this.pendingRequests.has(attrCorrelationId)) {
            // Not an orchestration response or not for this specific client instance.
            message.ack();
            return;
          }

          const envelope: EventEnvelope<any> = JSON.parse(message.data.toString());
          const { correlationId, data } = envelope;

          // Double check the request map (redundant but safe)
          if (correlationId && this.pendingRequests.has(correlationId)) {
            const { resolve, reject, timeout } = this.pendingRequests.get(correlationId)!;
            clearTimeout(timeout);
            this.pendingRequests.delete(correlationId);

            // Handle errors or resolve success
            if (data?.error) {
              reject(new ServiceUnavailableException(data.error));
            } else {
              // Unwrap the data field (supports summary, trends, or raw data)
              const responseData = data.data || data.summary || data.trends || data;
              resolve(responseData);
            }
            message.ack();
          } else {
            message.ack();
          }
        } catch (error: unknown) {
          this.logger.error(`EventOrchestratorClient: Error processing response message: ${(error as Error).message}`, (error as Error).stack);
          message.nack();
        }
      });

      subscription.on('error', (error: unknown) => {
        this.logger.error(`EventOrchestratorClient: Subscription error on ${this.responseSubscriptionName}: ${(error as Error).message}`, (error as Error).stack);
      });

      this.logger.log(`EventOrchestratorClient: Listening for responses on topic: ${responseTopic} | sub: ${this.responseSubscriptionName}`);
    } catch (error: unknown) {
      this.logger.error(`EventOrchestratorClient: Failed to set up response listener: ${(error as Error).message}`, (error as Error).stack);
      throw error;
    }
  }

  async request<TResponse, TRequest extends object>(
    requestTopic: EventTopic,
    requestEventType: EventType,
    payload: TRequest,
    requestDtoClass: new () => TRequest,
    timeoutMs = 30000, // Default 30 seconds for complex aggregations
  ): Promise<TResponse> {
    const correlationId = uuidv4();
    // Use segregated orchestration topic for replies
    const replyTo = this.config.responseTopic || EVENT_TOPICS.ORCHESTRATIONS;

    const requestEnvelope: OrchestrationEventEnvelope<TRequest> = {
      eventId: uuidv4(),
      eventType: requestEventType,
      eventSource: this.config.serviceName,
      timestamp: new Date().toISOString(),
      correlationId,
      replyTo,
      data: { ...payload, correlationId, replyTo },
    };

    return new Promise<TResponse>(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new ServiceUnavailableException(`Orchestration request timed out after ${timeoutMs}ms for event: ${requestEventType}`));
      }, timeoutMs);

      this.pendingRequests.set(correlationId, { resolve, reject, timeout });

      try {
        const attributes = { correlationId, replyTo };
        this.logger.debug(`[EventOrchestratorClient] Publishing request to ${requestTopic} (Reply-To: ${replyTo})`);

        await this.eventPublisher.publish(
          requestEventType,
          requestEnvelope.data,
          requestDtoClass,
          { correlationId, topic: requestTopic, attributes }
        );
      } catch (error: unknown) {
        clearTimeout(timeout);
        this.pendingRequests.delete(correlationId);
        this.logger.error(`EventOrchestratorClient: Failed to publish request event: ${(error as Error).message}`, (error as Error).stack);
        reject(new ServiceUnavailableException(`Failed to publish orchestration request: ${(error as Error).message}`));
      }
    });
  }
}
