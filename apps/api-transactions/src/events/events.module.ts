import { Module } from '@nestjs/common';
import { EventPublisherModule } from '@verichron/event-publisher';
import { EventSubscriberModule } from '@verichron/event-subscriber';
import { EVENT_SOURCES } from '@verichron/events';

/**
 * ============================================================================
 * EVENTS MODULE - Verichron Event-Driven Architecture
 * ============================================================================
 *
 * This module configures event infrastructure for api-transactions.
 *
 * ARCHITECTURAL DECISION: Three-Layer Event Validation Strategy
 * ===============================================================
 *
 * Our event system uses three distinct layers for type safety and validation:
 *
 * ## Layer 1: Payload Interfaces (@verichron/events)
 * Location: packages/events/src/payloads/
 * Purpose: Type contracts only - no validation logic
 * Usage: Shared type definitions across all services
 *
 * Example:
 *   export interface SettlementOfferCreatedPayload {
 *     settlementOfferId: string;
 *     debtId: string;
 *     organizationId: string;
 *     // ... other fields
 *   }
 *
 * ## Layer 2: Service Event DTOs (this microservice)
 * Location: apps/api-transactions/src/events/event-dto/
 * Purpose: Validate events this service publishes/consumes
 * Usage: Import these in services before publishing, not payload interfaces
 *
 * Example:
 *   export class SettlementOfferCreatedDto implements SettlementOfferCreatedPayload {
 *     @IsUUID()
 *     settlementOfferId: string;
 *     // ... validation decorators
 *   }
 *
 * ## Layer 3: Orchestration DTOs (@verichron/event-orchestrator)
 * Location: packages/event-orchestrator/src/dto/
 * Purpose: Validate orchestration request/response events
 * Usage: Only services that import @verichron/event-orchestrator can call it
 * Benefit: Compile-time enforcement of orchestration permissions
 *
 * NOTE: This service (api-transactions) does NOT import EventOrchestratorModule.
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
 * Used for: Domain events (settlement_offer.created, bankruptcy.filed, etc.)
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
 * import { SettlementOfferCreatedPayload } from '@verichron/events';
 *
 * const payload: SettlementOfferCreatedPayload = { ... };
 * await eventPublisher.publish<SettlementOfferCreatedPayload>(..., payload);
 *
 * ✅ CORRECT (Validated DTO):
 * import { SettlementOfferCreatedDto } from '../events/event-dto/settlement-offers';
 * import { plainToInstance } from 'class-transformer';
 * import { validate } from 'class-validator';
 *
 * const dto = plainToInstance(SettlementOfferCreatedDto, rawData);
 * const errors = await validate(dto);
 * if (errors.length > 0) throw new ValidationException(errors);
 *
 * await eventPublisher.publish(..., dto);
 *
 * EVENT SUBSCRIPTIONS
 * ===================
 *
 * api-transactions subscribes to the following events to enable key features:
 *
 * ### Consumed from `api-debts`:
 * - **`DEBTS_DEBT_CREATED`**: Used to auto-create payment plans for eligible debts (future).
 * - **`DEBTS_DEBT_STATUS_CHANGED`**: Used to pause/cancel payment plans when debts are disputed or settled.
 *
 * ### Consumed from `api-workflows`:
 * - **`WORKFLOWS_ESCALATION_CHECK`**: Used to trigger escalation logic based on broken promises or overdue accounts.
 *
 * Events api-transactions PUBLISHES:
 * - Transaction events: transaction.succeeded, transaction.failed, refund.issued, promise.broken
 * - Payment Plan events: payment_plan.created, payment_plan.status_changed, payment_plan.completed
 * - Settlement Offer events: settlement_offer.created, settlement_offer.accepted, settlement_offer.rejected, settlement_offer.completed, settlement_offer.defaulted
 * - Bankruptcy events: bankruptcy.filed, bankruptcy.status_updated
 *
 * CRITICAL EVENTS
 * ===============
 *
 * BankruptcyFiled event triggers automatic stay enforcement:
 * 1. Collection activities MUST cease immediately (FDCPA compliance)
 * 2. Communications halted
 * 3. Work queue items flagged
 * 4. Debt status updated
 *
 * This event is critical for:
 * - Legal compliance (automatic stay violations can result in sanctions)
 * - FDCPA compliance (collection prohibited during bankruptcy)
 * - Consumer protection
 *
 * SettlementOfferAccepted event triggers workflow:
 * 1. Debt status → IN_SETTLEMENT
 * 2. Interest freezes
 * 3. Payment plan created (if INSTALLMENT structure)
 * 4. Communications sent (acceptance letter)
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
      serviceName: EVENT_SOURCES.TRANSACTIONS,
    }),
    EventSubscriberModule.forRoot({
      projectId: process.env.PUBSUB_PROJECT_ID,
      emulatorHost: process.env.PUBSUB_EMULATOR_HOST,
      serviceName: EVENT_SOURCES.TRANSACTIONS,
    }),
  ],
  exports: [EventPublisherModule, EventSubscriberModule],
})
export class EventsModule {}
