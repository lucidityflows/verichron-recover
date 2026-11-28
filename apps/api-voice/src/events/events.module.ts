import { Module } from '@nestjs/common';
import { EventPublisherModule } from '@verichron/event-publisher';
import { EventSubscriberModule } from '@verichron/event-subscriber';
import { EVENT_SOURCES } from '@verichron/events';

/**
 * ============================================================================
 * EVENTS MODULE - Verichron Event-Driven Architecture
 * ============================================================================
 *
 * This module configures event infrastructure for api-debtors.
 *
 * ARCHITECTURAL DECISION: Three-Layer Event Validation Strategy
 * ===============================================================
 *
 * Our event system uses three distinct layers for type safety and validation:
 *
 * ## Layer 1: Payload Interfaces (@verichron/types)
 * Location: packages/types/src/events/payloads/
 * Purpose: Type contracts only - no validation logic
 * Usage: Shared type definitions across all services
 *
 * Example:
 *   export interface DebtorCreatedPayload {
 *     debtorId: string;
 *     firstName: string;
 *     lastName: string;
 *     // ... other fields
 *   }
 *
 * ## Layer 2: Service Event DTOs (this microservice)
 * Location: apps/api-debtors/src/events/event-dto/
 * Purpose: Validate events this service publishes/consumes
 * Usage: Import these in services before publishing, not payload interfaces
 *
 * Example:
 *   export class DebtorCreatedDto implements DebtorCreatedPayload {
 *     @IsUUID()
 *     debtorId: string;
 *     // ... validation decorators
 *   }
 *
 * ## Layer 3: Orchestration DTOs (@verichron/event-orchestrator)
 * Location: packages/event-orchestrator/src/dto/
 * Purpose: Validate orchestration request/response events
 * Usage: Only services that import @verichron/event-orchestrator can call it
 * Benefit: Compile-time enforcement of orchestration permissions
 *
 * NOTE: This service (api-debtors) does NOT import EventOrchestratorModule.
 * It cannot initiate orchestration workflows. If orchestration is needed in future,
 * the orchestrator will call this service via HTTP, not events.
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
 * Used for: Domain events (debtor.created, debtor.updated, etc.)
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
 * Used for: Cross-service workflows (if needed in future)
 * Response: Expected via correlationId
 * Tool: EventOrchestratorClient
 * Extends: EventEnvelope + adds replyTo field
 *
 * VALIDATION REQUIREMENTS
 * =======================
 *
 * ❌ INCORRECT (No validation - DO NOT DO THIS):
 * import { DebtorCreatedPayload } from '@verichron/types/events/payloads/debtors';
 *
 * const payload: DebtorCreatedPayload = { ... };
 * await eventPublisher.publish<DebtorCreatedPayload>(..., payload);
 *
 * ✅ CORRECT (Validated DTO):
 * import { DebtorCreatedDto } from '../events/event-dto/debtors';
 * import { plainToInstance } from 'class-transformer';
 * import { validate } from 'class-validator';
 *
 * const dto = plainToInstance(DebtorCreatedDto, rawData);
 * const errors = await validate(dto);
 * if (errors.length > 0) throw new ValidationException(errors);
 *
 * await eventPublisher.publish(..., dto);
 *
 * EVENT SUBSCRIPTIONS
 * ===================
 *
 * Per the README, api-debtors has minimal event subscriptions for stability:
 * - Does NOT subscribe to events from other services in MVP
 * - Future: May subscribe to UserRegistered, UserProfileUpdated from api-users
 *
 * Events api-debtors PUBLISHES:
 * - DebtorCreated: Published when a new debtor profile is created
 * - DebtorUpdated: Published when debtor profile is modified
 * - DebtorAddressUpdated: Published when debtor address changes
 * - DebtorUserLinked: Published when user account is linked to debtor profile
 * - VerificationCompleted: Published when verification workflow completes
 *
 * Events api-debtors CONSUMES (future):
 * - UserRegistered: To link user accounts to debtor profiles
 * - UserProfileUpdated: To request debtor profile updates
 * - VerificationRequested: To trigger verification workflows
 *
 * CRITICAL EVENTS
 * ===============
 *
 * DebtorCreated event triggers downstream workflows:
 * 1. api-communications subscribes to send debtor invitation emails
 * 2. api-organizations updates organization access records
 * 3. Future services can subscribe for additional workflows
 *
 * This event is critical for:
 * - User onboarding (invitation to register)
 * - Multi-tenant access control setup
 * - Audit trail and compliance tracking
 *
 * ============================================================================
 */
if (!process.env.PUBSUB_PROJECT_ID) {
  throw new Error('PUBSUB_PROJECT_ID environment variable is not set.');
}

@Module({
  imports: [
    EventPublisherModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.VOICE,
    }),
    EventSubscriberModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.VOICE,
    }),
  ],
  exports: [EventPublisherModule, EventSubscriberModule],
})
export class EventsModule {}
