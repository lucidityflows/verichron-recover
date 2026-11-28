import { Module } from '@nestjs/common';
import { GatewaysController } from './gateway.controller';
import { GatewaysService } from './gateway.service';
import { StripeService } from './stripe/stripe.service';

/**
 * Gateways Module
 * 
 * Manages payment gateway integration and orchestration.
 * Provides a facade for multiple payment providers with Stripe as the MVP implementation.
 * 
 * Architecture:
 * - GatewaysService: Facade that selects and delegates to providers
 * - StripeService: Stripe-specific implementation
 * - GatewaysController: Webhook endpoints for gateway callbacks
 * 
 * Future providers can be added by:
 * 1. Creating a new service implementing IPaymentProvider
 * 2. Registering it in providers array
 * 3. Adding switch case in GatewaysService
 * 
 * Security:
 * - All webhook endpoints verify signatures
 * - API keys loaded from environment/secrets
 * - No raw card data handling
 * 
 * Exports:
 * - GatewaysService: For internal use by transactions module
 */
@Module({
  controllers: [GatewaysController],
  providers: [GatewaysService, StripeService],
  exports: [GatewaysService],
})
export class GatewaysModule {}