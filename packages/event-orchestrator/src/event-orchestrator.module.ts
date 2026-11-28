import { Module, DynamicModule, Provider } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EventPublisherModule, EventPublisherConfig } from '@verichron/event-publisher';
import { EventSubscriberModule, EventSubscriberConfig } from '@verichron/event-subscriber';
import { EventSource } from '@verichron/events';
import {
  OnboardingOrchestrator,
  CollectorsDataOrchestrator,
  WorkQueueDataOrchestrator,
} from './orchestrators';
import { EventOrchestratorClient } from './event-orchestrator.client';

/**
 * Event Orchestrator Configuration
 * 
 * Configuration for the event orchestrator system.
 */
export interface EventOrchestratorConfig {
  /**
   * GCP Project ID
   */
  projectId: string;

  /**
   * Service name for this orchestrator instance
   */
  serviceName: EventSource;

  /**
   * Optional: Emulator host for local development
   */
  emulatorHost?: string;

  /**
   * Service endpoints for HTTP calls
   * Map of service name to base URL
   */
  serviceEndpoints: {
    'api-users'?: string;
    'api-organizations'?: string;
    'api-debts'?: string;
    'api-debtors'?: string;
    'api-transactions'?: string;
    'api-communications'?: string;
    'api-collectors'?: string;
    'api-voice'?: string;
    'api-workflows'?: string;
    'api-automations'?: string;
  };

  /**
   * Optional: Topic for client to listen for responses. Defaults to request topic.
   */
  responseTopic?: string;

  /**
   * Optional: Topic for client to publish requests. Defaults to response topic.
   */
  requestTopic?: string;

  /**
   * Optional: Default timeout for HTTP calls (milliseconds)
   * @default 5000
   */
  httpTimeout?: number;
}

/**
 * Event Orchestrator Module
 * 
 * Provides event orchestration capabilities for complex, cross-service workflows.
 * This module combines event listening, HTTP service calls, and event publishing
 * to coordinate multi-step processes that span multiple bounded contexts.
 * 
 * Use cases:
 * - Organization onboarding (create org, create admin user, send welcome email)
 * - Payment plan workflows (validate debt, check threshold, create plan, notify debtor)
 * - Transaction reconciliation (update balance, generate receipt, log activity)
 * 
 * Architecture:
 * - Imports EventSubscriberModule for listening to events
 * - Imports EventPublisherModule for publishing new events
 * - Provides HTTP clients for service-to-service communication
 * - Orchestrator services coordinate the workflows
 * 
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [
 *     EventOrchestratorModule.forRoot({
 *       projectId: process.env.GCP_PROJECT_ID || 'local-dev',
 *       serviceName: 'orchestrator',
 *       emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
 *       serviceEndpoints: {
 *         'api-users': process.env.API_USERS_URL || 'http://localhost:3000',
 *         'api-organizations': process.env.API_ORGANIZATIONS_URL || 'http://localhost:3002',
 *       },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Module({})
export class EventOrchestratorModule {
  /**
   * Configure the event orchestrator module
   * 
   * @param config Orchestrator configuration
   * @returns Configured dynamic module
   */
  static forRoot(config: EventOrchestratorConfig): DynamicModule {
    const configProvider: Provider = {
      provide: 'EVENT_ORCHESTRATOR_CONFIG',
      useValue: config,
    };

    // Create subscriber config from orchestrator config
    const subscriberConfig: EventSubscriberConfig = {
      projectId: config.projectId,
      emulatorHost: config.emulatorHost,
      serviceName: config.serviceName,
    };

    // Create publisher config from orchestrator config
    const publisherConfig: EventPublisherConfig = {
      projectId: config.projectId,
      serviceName: config.serviceName,
      emulatorHost: config.emulatorHost,
    };

    return {
      module: EventOrchestratorModule,
      imports: [
        // Import subscriber for listening to events
        EventSubscriberModule.forRoot(subscriberConfig),
        // Import publisher for publishing events
        EventPublisherModule.forRoot(publisherConfig),
        // Import HTTP module for service-to-service calls
        HttpModule.register({
          timeout: config.httpTimeout || 5000,
          maxRedirects: 5,
        }),
      ],
      // Note: EventPublisher and EventSubscriber are injected from parent module (EventsModule)
      // which already initializes EventPublisherModule.forRoot() and EventSubscriberModule.forRoot()
      providers: [
        configProvider,
        EventOrchestratorClient,
      ],
      exports: [
        'EVENT_ORCHESTRATOR_CONFIG',
        HttpModule,
        EventOrchestratorClient,
      ],
    };
  }
}