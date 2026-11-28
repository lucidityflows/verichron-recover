import { Injectable, Logger } from '@nestjs/common';
import type { PaymentGatewayResponse } from '@verichron/contracts';
import { StripeService } from './stripe/stripe.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';

/**
 * Gateways Service (Facade)
 * 
 * Acts as a facade for choosing and orchestrating payment providers.
 * Provides a unified interface for payment processing regardless of the underlying provider.
 * 
 * Key responsibilities:
 * - Provider selection (currently hardcoded to Stripe, future: organization settings)
 * - Delegating to appropriate provider service
 * - Abstracting provider-specific implementation details
 * 
 * Design Pattern: Facade Pattern
 * - Simplifies the interface to a complex subsystem (multiple payment providers)
 * - Provides a single entry point for payment operations
 * - Makes adding new providers straightforward (implement IPaymentProvider interface)
 */
@Injectable()
export class GatewaysService {
  private readonly logger = new Logger(GatewaysService.name);

  constructor(private readonly stripeService: StripeService) {}

  /**
   * Process a payment charge
   * 
   * Selects the appropriate payment provider and delegates the charge operation.
   * For MVP, only Stripe is supported.
   * 
   * Future enhancement: Fetch provider preference from organization settings
   * via api-organizations: GET /organizations/{id}/settings
   * 
   * @param paymentDto Payment details
   * @returns Standardized gateway response
   */
  async processPayment(paymentDto: ProcessPaymentDto): Promise<PaymentGatewayResponse> {
    this.logger.log('Processing payment via gateway');

    // For MVP, Stripe is the only provider
    const provider = 'STRIPE';

    // Future: Fetch from organization settings
    // const orgSettings = await this.organizationsClient.getSettings(organizationId);
    // const provider = orgSettings.payment_provider || 'STRIPE';

    switch (provider) {
      case 'STRIPE':
        return this.stripeService.charge(paymentDto);

      // Future providers:
      // case 'PLAID':
      //   return this.plaidService.charge(paymentDto);
      // case 'PAYPAL':
      //   return this.paypalService.charge(paymentDto);

      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }

  /**
   * Process a refund
   * 
   * Selects the appropriate payment provider and delegates the refund operation.
   * The provider is determined by the original transaction's gateway.
   * 
   * For MVP, only Stripe is supported.
   * 
   * @param refundDto Refund details
   * @returns Standardized gateway response
   */
  async processRefund(refundDto: ProcessRefundDto): Promise<PaymentGatewayResponse> {
    this.logger.log('Processing refund via gateway');

    // For MVP, Stripe is the only provider
    const provider = 'STRIPE';

    // Future: Determine provider from original transaction
    // Could store provider in transaction metadata or parse from gatewayTransactionId format

    switch (provider) {
      case 'STRIPE':
        return this.stripeService.refund(refundDto);

      // Future providers:
      // case 'PLAID':
      //   return this.plaidService.refund(refundDto);
      // case 'PAYPAL':
      //   return this.paypalService.refund(refundDto);

      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }

  /**
   * Get current health status of payment gateways
   */
  async getGatewayStatus() {
    const stripeHealth = await this.stripeService.checkHealth();
    return {
      stripe: {
        status: stripeHealth.status,
        mode: 'live', // Future: from config
        error: stripeHealth.error,
      },
    };
  }
}