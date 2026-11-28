import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import type {
  IPaymentProvider,
  PaymentGatewayResponse,
  ProcessPaymentPayload,
  ProcessRefundPayload,
} from '@verichron/contracts';
import { GatewayException } from '../errors';

/**
 * Stripe Service
 * 
 * Implements all Stripe-specific payment processing logic.
 * Isolates Stripe API calls and error handling from the rest of the application.
 * 
 * Key responsibilities:
 * - Charge creation with idempotency keys
 * - Refund processing
 * - Error translation to standardized format
 * - Retry logic for transient failures
 */
@Injectable()
export class StripeService implements IPaymentProvider {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second base delay

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    if (!apiKey) {
      throw new Error(
        'STRIPE_SECRET_KEY environment variable is required but not set',
      );
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-10-29.clover', // Use latest stable API version
      typescript: true,
    });

    this.logger.log('Stripe service initialized');
  }

  /**
   * Check Stripe connectivity
   */
  async checkHealth(): Promise<{ status: string; error?: string }> {
    try {
      await this.stripe.balance.retrieve();
      return { status: 'active' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Stripe health check failed: ${errorMessage}`);
      return { status: 'failed', error: errorMessage };
    }
  }

  /**
   * Process a payment charge via Stripe
   * 
   * Workflow:
   * 1. Create charge with idempotency key
   * 2. Handle Stripe-specific errors
   * 3. Retry on transient failures
   * 4. Return standardized response
   * 
   * @param paymentPayload Payment details
   * @returns Standardized payment gateway response
   */
  async charge(
    paymentPayload: ProcessPaymentPayload,
  ): Promise<PaymentGatewayResponse> {
    this.logger.log(
      `Processing Stripe charge: ${paymentPayload.amount} ${paymentPayload.currency || 'USD'}`, 
    );

    return this.executeWithRetry(async () => {
      try {
        // Create payment intent with idempotency key
        const paymentIntent = await this.stripe.paymentIntents.create(
          {
            amount: Math.round(paymentPayload.amount * 100), // Stripe expects amount in cents
            currency: paymentPayload.currency || 'usd',
            payment_method: paymentPayload.paymentMethodToken,
            confirm: true, // Automatically confirm the payment
            metadata: paymentPayload.metadata || {},
            automatic_payment_methods: {
              enabled: true,
              allow_redirects: 'never', // No redirects for server-side payments
            },
          },
          {
            idempotencyKey: paymentPayload.idempotencyKey,
          },
        );

        // Check if payment succeeded
        if (paymentIntent.status === 'succeeded') {
          this.logger.log(`Stripe charge succeeded: ${paymentIntent.id}`);

          return {
            success: true,
            transactionId: paymentIntent.id,
            rawResponse: paymentIntent,
          };
        } else {
          // Payment did not succeed (e.g., requires_action, processing)
          const failureReason = `Payment status: ${paymentIntent.status}`;
          this.logger.warn(`Stripe charge incomplete: ${failureReason}`);

          return {
            success: false,
            failureReason,
            rawResponse: paymentIntent,
          };
        }
      } catch (error) {
        return this.handleStripeError(error, 'charge');
      }
    });
  }

  /**
   * Process a refund via Stripe
   * 
   * Workflow:
   * 1. Create refund with idempotency key
   * 2. Handle Stripe-specific errors
   * 3. Retry on transient failures
   * 4. Return standardized response
   * 
   * @param refundPayload Refund details
   * @returns Standardized payment gateway response
   */
  async refund(
    refundPayload: ProcessRefundPayload,
  ): Promise<PaymentGatewayResponse> {
    this.logger.log(
      `Processing Stripe refund: ${refundPayload.amount} for charge ${refundPayload.originalGatewayTransactionId}`,
    );

    return this.executeWithRetry(async () => {
      try {
        // Create refund with idempotency key
        const refund = await this.stripe.refunds.create(
          {
            payment_intent: refundPayload.originalGatewayTransactionId,
            amount: Math.round(refundPayload.amount * 100), // Stripe expects amount in cents
            metadata: refundPayload.metadata || {},
          },
          {
            idempotencyKey: refundPayload.idempotencyKey,
          },
        );

        // Check if refund succeeded
        if (refund.status === 'succeeded') {
          this.logger.log(`Stripe refund succeeded: ${refund.id}`);

          return {
            success: true,
            transactionId: refund.id, // Changed from refundId
            rawResponse: refund,
          };
        } else {
          // Refund did not succeed immediately (e.g., pending)
          const failureReason = `Refund status: ${refund.status}`;
          this.logger.warn(`Stripe refund incomplete: ${failureReason}`);

          return {
            success: false,
            failureReason,
            rawResponse: refund,
          };
        }
      } catch (error) {
        return this.handleStripeError(error, 'refund');
      }
    });
  }

  /**
   * Verify Stripe webhook signature
   * 
   * CRITICAL SECURITY FUNCTION: Verifies that webhook requests actually
   * come from Stripe and haven't been tampered with.
   * 
   * @param payload Raw request body
   * @param signature Stripe-Signature header value
   * @returns Parsed and verified Stripe event
   * @throws WebhookVerificationFailedException if verification fails
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error(
        'STRIPE_SECRET_KEY environment variable is required but not set',
      );
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );

      this.logger.log(`Webhook signature verified: ${event.type}`);

      return event;
    } catch (error) {
      this.logger.error(`Webhook verification failed:`, error);
      throw error; // Will be caught by controller and converted to WebhookVerificationFailedException
    }
  }

  /**
   * Handle Stripe-specific errors and convert to standardized format
   * 
   * @param error Stripe error object
   * @param operation Operation being performed (for logging)
   * @returns Standardized failure response
   */
  private handleStripeError(
    error: any,
    operation: string,
  ): PaymentGatewayResponse {
    if (error.type === 'StripeCardError') {
      // Card declined or other card-specific error
      const failureReason = error.message || 'Card declined';
      this.logger.warn(`Stripe card error during ${operation}: ${failureReason}`);

      return {
        success: false,
        failureReason,
        rawResponse: error,
      };
    } else if (error.type === 'StripeInvalidRequestError') {
      // Invalid parameters or request
      const failureReason = error.message || 'Invalid request';
      this.logger.error(`Stripe invalid request during ${operation}: ${failureReason}`);

      return {
        success: false,
        failureReason,
        rawResponse: error,
      };
    } else if (
      error.type === 'StripeAPIError' ||
      error.type === 'StripeConnectionError'
    ) {
      // Transient error - will be retried by executeWithRetry
      this.logger.error(`Stripe transient error during ${operation}:`, error);
      throw error; // Re-throw to trigger retry
    } else {
      // Unknown error
      const failureReason = error.message || 'Unknown gateway error';
      this.logger.error(`Stripe unknown error during ${operation}:`, error);

      return {
        success: false,
        failureReason,
        rawResponse: error,
      };
    }
  }

  /**
   * Execute operation with exponential backoff retry logic
   * 
   * Retries on transient network/API errors (502, 503, timeouts).
   * Does NOT retry on business logic errors (card declined, invalid request).
   * 
   * @param operation Async operation to execute
   * @returns Operation result
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Check if error is retryable (transient)
        const isRetryable =
          (error as any)?.type === 'StripeAPIError' ||
          (error as any)?.type === 'StripeConnectionError' ||
          (error as any)?.statusCode === 502 ||
          (error as any)?.statusCode === 503;

        if (!isRetryable || attempt === this.maxRetries) {
          this.logger.error(
            `Operation failed after ${attempt} attempt(s), not retrying`,
          );
          throw new GatewayException(
            'Stripe',
            'operation',
            lastError.message || 'Unknown error',
          );
        }

        // Calculate exponential backoff delay
        const delay = this.retryDelay * Math.pow(2, attempt - 1);

        this.logger.warn(
          `Transient error, retrying in ${delay}ms (attempt ${attempt}/${this.maxRetries})`,
        );

        await this.sleep(delay);
      }
    }

    // Should never reach here, but TypeScript needs this
    throw new GatewayException('Stripe', 'operation', 'Max retries exceeded');
  }

  /**
   * Sleep utility for retry delays
   * 
   * @param ms Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}