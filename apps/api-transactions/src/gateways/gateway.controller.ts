import {
  Controller,
  Post,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { StripeService } from './stripe/stripe.service';
import { WebhookVerificationFailedException } from './errors';

/**
 * Gateways Controller
 * 
 * Handles webhook endpoints for payment gateway callbacks.
 * Does NOT provide direct payment initiation endpoints - all payments
 * are initiated through the transactions service.
 * 
 * CRITICAL SECURITY: All webhook endpoints MUST verify signatures
 * to prevent spoofing attacks.
 */
@ApiTags('Payment Gateways')
@Controller('public/transactions/gateways')
export class GatewaysController {
  private readonly logger = new Logger(GatewaysController.name);

  constructor(private readonly stripeService: StripeService) {}

  /**
   * Stripe Webhook Endpoint
   * 
   * Receives and processes webhook events from Stripe.
   * 
   * SECURITY: Verifies Stripe signature before processing.
   * 
   * Supported events:
   * - charge.succeeded: Confirms successful payment
   * - charge.failed: Indicates payment failure
   * - charge.dispute.created: Chargeback notification
   * 
   * Future events:
   * - payment_intent.succeeded
   * - payment_intent.payment_failed
   * - refund.created
   * - refund.updated
   * 
   * Note: Webhook processing is primarily for redundancy and audit.
   * The main flow already handles success/failure via synchronous API responses.
   */
  @Post('stripe/webhooks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description:
      'Receives webhook events from Stripe. Signature verification is required. ' +
      'This endpoint handles asynchronous event notifications from Stripe.',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook received and processed successfully',
    schema: {
      type: 'object',
      properties: {
        received: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Webhook signature verification failed',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook payload',
  })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    this.logger.log('Received Stripe webhook');

    if (!signature) {
      this.logger.error('Stripe webhook received without signature header');
      throw new WebhookVerificationFailedException('Stripe');
    }

    // Get raw body for signature verification
    // NestJS RawBodyRequest provides access to the raw buffer
    const rawBody = request.rawBody;

    if (!rawBody) {
      this.logger.error('Stripe webhook received without raw body');
      throw new WebhookVerificationFailedException('Stripe');
    }

    try {
      // Verify signature and parse event
      const event = this.stripeService.verifyWebhookSignature(rawBody, signature);

      // Process event based on type
      await this.processStripeEvent(event);

      return { received: true };
    } catch (error) {
      this.logger.error('Stripe webhook processing failed:', error);

      // Check if error is related to signature verification
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('signature')) {
        throw new WebhookVerificationFailedException('Stripe');
      }

      throw error;
    }
  }

  /**
   * Process Stripe webhook events
   * 
   * Handles different event types and performs appropriate actions.
   * Most events are logged for audit purposes; critical events may
   * trigger updates to transaction records.
   * 
   * @param event Verified Stripe event
   */
  private async processStripeEvent(event: any): Promise<void> {
    this.logger.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'charge.succeeded':
        await this.handleChargeSucceeded(event.data.object);
        break;

      case 'charge.failed':
        await this.handleChargeFailed(event.data.object);
        break;

      case 'charge.dispute.created':
        await this.handleDisputeCreated(event.data.object);
        break;

      case 'payment_intent.succeeded':
        // Payment intent succeeded (modern Stripe flow)
        this.logger.log(
          `Payment intent succeeded: ${event.data.object.id}`,
        );
        break;

      case 'payment_intent.payment_failed':
        // Payment intent failed (modern Stripe flow)
        this.logger.log(
          `Payment intent failed: ${event.data.object.id}`,
        );
        break;

      default:
        this.logger.log(`Unhandled Stripe event type: ${event.type}`);
    }
  }

  /**
   * Handle charge.succeeded event
   * 
   * Confirms successful payment. In most cases, this is redundant with
   * the synchronous API response, but provides audit confirmation.
   * 
   * @param charge Stripe charge object
   */
  private async handleChargeSucceeded(charge: any): Promise<void> {
    this.logger.log(`Charge succeeded: ${charge.id} - $${charge.amount / 100}`);

    // TODO: Update transaction record if not already SUCCEEDED
    // This provides redundancy in case the synchronous API response was lost
    // Query: SELECT * FROM transaction_history WHERE gateway_transaction_id = charge.id
    // If status is still PROCESSING, update to SUCCEEDED

    // For now, log for audit
    this.logger.log(
      `Charge confirmation received for ${charge.id} (webhook)`,
    );
  }

  /**
   * Handle charge.failed event
   * 
   * Indicates payment failure. In most cases, this is redundant with
   * the synchronous API response, but provides audit confirmation.
   * 
   * @param charge Stripe charge object
   */
  private async handleChargeFailed(charge: any): Promise<void> {
    this.logger.warn(
      `Charge failed: ${charge.id} - ${charge.failure_message || 'Unknown reason'}`,
    );

    // TODO: Update transaction record if not already FAILED
    // Query: SELECT * FROM transaction_history WHERE gateway_transaction_id = charge.id
    // If status is still PROCESSING, update to FAILED with failure_reason

    // For now, log for audit
    this.logger.log(
      `Charge failure confirmed for ${charge.id} (webhook)`,
    );
  }

  /**
   * Handle charge.dispute.created event
   * 
   * Notifies of a chargeback/dispute. This requires manual intervention.
   * 
   * @param dispute Stripe dispute object
   */
  private async handleDisputeCreated(dispute: any): Promise<void> {
    this.logger.error(
      `CHARGEBACK ALERT: Dispute created for charge ${dispute.charge} - Amount: $${dispute.amount / 100}`,
    );

    // TODO: Create incident record for manual review
    // TODO: Notify organization admins
    // TODO: Update transaction record with dispute status

    // For MVP, log critical alert
    this.logger.error(
      `Dispute ${dispute.id} requires manual intervention - Reason: ${dispute.reason}`,
    );
  }
}