import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventPublisherModule } from '@verichron/event-publisher';
import { PlansController } from './payment-plan.controller';
import { PlansInternalController } from './payment-plans.internal.controller';
import { PlansService } from './payment-plan.service';
import { PaymentPlan } from './entities/payment-plan.entity';
import { PaymentPlanDebt } from './entities/payment-plan-debt.entity';
import { TransactionsModule } from '../transactions/transaction.module';

/**
 * Plans Module
 *
 * Manages payment plan operations including creation, approval workflows,
 * scheduled payment generation, and multi-debt consolidation.
 *
 * Dependencies:
 * - TransactionsModule: For creating scheduled payments
 * - EventPublisherModule: For publishing payment plan events
 *
 * Exports:
 * - PlansService: For internal use by other modules (e.g., event handlers)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentPlan, PaymentPlanDebt]),
    TransactionsModule,
    EventPublisherModule,
  ],
  controllers: [PlansController, PlansInternalController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}