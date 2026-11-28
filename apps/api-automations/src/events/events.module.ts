import { Module, Global, forwardRef } from '@nestjs/common';
import { EventPublisherModule } from '@verichron/event-publisher';
import { EventSubscriberModule } from '@verichron/event-subscriber';
import { EventOrchestratorModule } from '@verichron/event-orchestrator';
import { EVENT_SOURCES } from '@verichron/events';
import { AutoAssignmentModule } from '../auto-assignment/auto-assignment.module';
import { EscalationModule } from '../escalation/escalation.module';
import { VerificationModule } from '../verification/verification.module';
import { ExecuteAutoAssignmentListener } from './listeners/execute-auto-assignment.listener';
import { ExecuteScheduledAutoAssignmentListener } from './listeners/execute-scheduled-auto-assignment.listener';
import { ExecuteEscalationListener } from './listeners/execute-escalation.listener';
import { ExecuteWorkflowCommandListener } from './listeners/execute-workflow-command.listener';

/**
 * ============================================================================
 * EVENTS MODULE - Verichron Event-Driven Architecture
 * ============================================================================
 *
 * This module configures event infrastructure for api-organizations.
 *
 * ARCHITECTURAL DECISION: Three-Layer Event Validation Strategy
 * ===============================================================
 *
 * Our event system uses three distinct layers for type safety and validation:
 *
 * ## Layer 1: Payload Interfaces (@verichron/events)
 * Location: packages/types/src/events/payloads/
 * Purpose: Type contracts only - no validation logic
 * Usage: Shared type definitions across all services
 *
 * Example:
 *   export interface OrganizationCreatedPayload {
 *     organizationId: string;
 *     organizationName: string;
 *     // ... other fields
 *   }
 *
 * ## Layer 2: Service Event DTOs (this microservice)
 * Location: apps/api-organizations/src/events/event-dto/
 * Purpose: Validate events this service publishes/consumes
 * Usage: Import these in services before publishing, not payload interfaces
 *
 * Example:
 *   export class OrganizationCreatedDto implements OrganizationCreatedPayload {
 *     @IsUUID()
 *     organizationId: string;
 *     // ... validation decorators
 *   }
 *
 * ## Layer 3: Orchestration DTOs (@verichron/event-orchestrator)
 * Location: packages/event-orchestrator/src/dto/
 * Purpose: Validate orchestration request/response events
 * Usage: Only services that import @verichron/event-orchestrator can call it
 * Benefit: Compile-time enforcement of orchestration permissions
 *
 * Example:
 *   import { OrganizationOnboardingRequestedDto } from '@verichron/event-orchestrator/dto';
 *
 * WHY THREE LAYERS?
 * =================
 * 1. Fail-fast: Invalid data is rejected at service boundaries, not downstream
 * 2. Type Safety: Interfaces provide compile-time checks, DTOs provide runtime validation
 * 3. Scalability: As we grow to 6+ microservices, validation is decentralized
 * 4. Security: Orchestration permissions enforced via package imports
 * 5. Industry Standard: Follows Netflix/Uber/Temporal microservice patterns
 *
 * DUAL ENVELOPE PATTERN
 * =====================
 *
 * We use two envelope types for different communication patterns:
 *
 * ## EventEnvelope (Fire-and-Forget)
 * Used for: Domain events (user.created, organization.updated, etc.)
 * Response: No response expected
 * Tool: EventPublisher
 *
 * Structure:
 *   {
 *     eventId: string,
 *     eventType: EventType,
 *     eventSource: EventSource,
 *     timestamp: string,
 *     correlationId?: string,
 *     data: T  // Validated DTO instance
 *   }
 *
 * ## OrchestrationEventEnvelope (Request-Response)
 * Used for: Cross-service workflows (onboarding, analytics aggregation)
 * Response: Expected via correlationId
 * Tool: EventOrchestratorClient
 * Extends: EventEnvelope + adds replyTo field
 *
 * Structure:
 *   {
 *     ...EventEnvelope,
 *     replyTo: string  // Topic for response
 *   }
 *
 * This dual pattern implements CQRS (Command Query Responsibility Segregation)
 * at the event level - industry standard for scalable event-driven systems.
 *
 * VALIDATION REQUIREMENTS
 * =======================
 *
 * ❌ INCORRECT (No validation - DO NOT DO THIS):
 * import { OrganizationCreatedPayload } from '@verichron/events/payloads/organizations';
 *
 * const payload: OrganizationCreatedPayload = { ... };
 * await eventPublisher.publish<OrganizationCreatedPayload>(..., payload);
 *
 * ✅ CORRECT (Validated DTO):
 * import { OrganizationCreatedDto } from '../events/event-dto/organizations';
 * import { plainToInstance } from 'class-transformer';
 * import { validate } from 'class-validator';
 *
 * const dto = plainToInstance(OrganizationCreatedDto, rawData);
 * const errors = await validate(dto);
 * if (errors.length > 0) throw new ValidationException(errors);
 *
 * await eventPublisher.publish(..., dto);
 *
 * TRANSPORT SAFETY
 * ================
 *
 * Events travel through GCP Pub/Sub. Validation ensures:
 * - Malformed data is rejected before network transmission
 * - Consumer services receive valid, typed data
 * - Cascading failures from bad data are prevented
 * - Better error messages for debugging
 *
 * ORCHESTRATION PERMISSIONS
 * =========================
 *
 * Not all services can call event-orchestrator. Permission is enforced by:
 *
 * 1. Only services with EventOrchestratorModule imported can publish orchestration events
 * 2. Orchestration DTOs live in @verichron/event-orchestrator package
 * 3. Services without the dependency cannot import orchestration DTOs
 * 4. TypeScript compilation fails if a service tries to use orchestration without permission
 *
 * Current orchestration-enabled services: 
 * - api-organizations (initiates onboarding)
 *
 * Future orchestration-enabled services: TBD
 *
 * HTTP vs Events in Orchestration
 * ================================
 *
 * Orchestrator receives orchestration requests via events, but calls downstream
 * services via HTTP (axios):
 *
 * Flow:
 * 1. api-organizations publishes ONBOARDING_REQUESTED event (validated DTO)
 * 2. event-orchestrator listens (validates with orchestration DTO)
 * 3. event-orchestrator calls api-users via HTTP POST /internal/provision-initial-admin
 * 4. api-users validates HTTP request with standard controller DTO
 * 5. event-orchestrator publishes ONBOARDING_COMPLETED event
 * 6. api-organizations listens (validates with orchestration DTO)
 *
 * Why HTTP for service calls?
 * - Synchronous responses with error handling
 * - Standard REST contract validation (existing controller DTOs)
 * - Orchestrator doesn't need to understand domain-specific validation rules
 *
 * SCALABILITY TO 6+ MICROSERVICES
 * ================================
 *
 * As we add more services (api-debts, api-communications, etc.):
 * - Each service maintains its own event-dto directory for domain events
 * - Orchestration DTOs remain centralized in @verichron/event-orchestrator
 * - Type contracts in @verichron/events grow but remain validation-free
 * - Validation is decentralized but contracts are shared
 *
 * This scales because:
 * - No single service becomes a validation bottleneck
 * - Each bounded context owns its validation rules
 * - Type safety is maintained across service boundaries
 * - Orchestrator permissions are explicit and compile-time enforced
 *
 * ============================================================================
 */
if (!process.env.PUBSUB_PROJECT_ID) {
  throw new Error('PUBSUB_PROJECT_ID environment variable is not set.');
}

@Global()
@Module({
  imports: [    EventPublisherModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.AUTOMATIONS,
    }),
    EventSubscriberModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.AUTOMATIONS,
    }),
    EventOrchestratorModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.AUTOMATIONS,
      responseTopic: 'automations-v1',
      serviceEndpoints: {
        'api-users': process.env.API_USERS_URL || 'http://localhost:3001',
        'api-organizations': process.env.API_ORGANIZATIONS_URL || 'http://localhost:3002',
        'api-debts': process.env.API_DEBTS_URL || 'http://localhost:3003',
        'api-transactions': process.env.API_TRANSACTIONS_URL || 'http://localhost:3005',
        'api-debtors': process.env.API_DEBTORS_URL || 'http://localhost:3004',
        'api-communications': process.env.API_COMMUNICATIONS_URL || 'http://localhost:3006',
        'api-collectors': process.env.API_COLLECTORS_URL || 'http://localhost:3007',
        'api-voice': process.env.API_VOICE_URL || 'http://localhost:3008',
        'api-workflows': process.env.API_WORKFLOWS_URL || 'http://localhost:3009',
        'api-automations': process.env.API_AUTOMATIONS_URL || 'http://localhost:3010',
      },
    }),
    forwardRef(() => AutoAssignmentModule),
    forwardRef(() => EscalationModule),
    VerificationModule,
  ],
  providers: [
    ExecuteAutoAssignmentListener,
    ExecuteScheduledAutoAssignmentListener,
    ExecuteEscalationListener,
    ExecuteWorkflowCommandListener,
  ],
  exports: [EventPublisherModule, EventSubscriberModule, EventOrchestratorModule],
})
export class EventsModule {}