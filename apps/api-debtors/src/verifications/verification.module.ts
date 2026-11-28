// verification.module.ts
import { Module, Injectable, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { VerificationRequest } from './entities/verification.entity';
import { ProfilesModule } from '../profiles/profiles.module';
import { AddressVerificationProvider } from './providers/address-verification.provider';
import { PhoneVerificationProvider } from './providers/phone-verification.provider';
import { EmailVerificationProvider } from './providers/email-verification.provider';
import { SkipTraceProvider } from './providers/skip-trace.provider';
import type { EventEnvelope, VerificationRequestedPayload } from '@verichron/events';
import { EventsModule } from '../events';

/**
 * Verification Module
 * 
 * Manages event-driven verification workflows for debtor data validation.
 * 
 * Key features:
 * - Multiple verification types with provider abstraction
 * - Async processing with status tracking
 * - Retry mechanism for failed verifications
 * - Third-party provider integration (stub implementations for MVP)
 * 
 * Providers included:
 * - Address verification (USPS stub)
 * - Phone verification (Twilio stub)
 * - Email verification (ZeroBounce stub)
 * - Skip trace (TLOxp stub)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationRequest]),
    ProfilesModule, // Import to access ProfilesService for verification
    EventsModule
  ],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    AddressVerificationProvider,
    PhoneVerificationProvider,
    EmailVerificationProvider,
    SkipTraceProvider,
  ],
  exports: [VerificationService], // Export for use by other modules and event handlers
})
export class VerificationModule {}



// ========== Event Handler ==========
// verification.processor.ts

/**
 * Verification Processor (Event Handler)
 * 
 * Listens for VerificationRequested events and triggers verification processing.
 * 
 * Event Flow:
 * 1. VerificationRequested event received from Pub/Sub
 * 2. Extract verificationId from payload
 * 3. Call verificationService.processVerification()
 * 4. Service orchestrates provider call and updates status
 * 5. Service publishes VerificationCompleted or VerificationFailed event
 * 
 * For MVP, this is structured but not actively consuming from Pub/Sub.
 * Production deployment would wire this up to actual Pub/Sub subscriptions.
 */
@Injectable()
export class VerificationProcessor {
  private readonly logger = new Logger(VerificationProcessor.name);

  constructor(private readonly verificationService: VerificationService) {}

  /**
   * Handle VerificationRequested event
   * 
   * @param event - Event envelope containing verification request data
   */
  async handle(
    event: EventEnvelope<VerificationRequestedPayload>,
  ): Promise<void> {
    const { data, eventId, correlationId } = event;
    const { verificationId, debtorId, organizationId, verificationType } = data;

    this.logger.log(
      `Processing VerificationRequested event ${eventId} for verification ${verificationId}`,
    );

    try {
      // Trigger verification processing
      await this.verificationService.processVerification(verificationId);

      this.logger.log(
        `Successfully processed verification ${verificationId} (type: ${verificationType})`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to process VerificationRequested event ${eventId}: ${errorMessage}`,
        errorStack,
      );

      // TODO: Implement retry logic or dead-letter queue
      // For now, we'll let the error bubble up so Pub/Sub can retry
      throw error;
    }
  }
}

/**
 * Example Pub/Sub Subscription Setup (for reference)
 * 
 * This would typically be in a separate events module or main.ts
 * 
 * ```typescript
 * import { PubSub } from '@google-cloud/pubsub';
 * 
 * const pubsub = new PubSub({
 *   projectId: process.env.PUBSUB_PROJECT_ID,
 *   apiEndpoint: process.env.PUBSUB_EMULATOR_HOST,
 * });
 * 
 * const subscription = pubsub.subscription('verification-requested-sub');
 * 
 * subscription.on('message', async (message) => {
 *   try {
 *     const event = JSON.parse(message.data.toString());
 *     await processor.handle(event);
 *     message.ack();
 *   } catch (error) {
 *     logger.error('Failed to process message', error);
 *     message.nack(); // Negative acknowledgment - will retry
 *   }
 * });
 * ```
 */