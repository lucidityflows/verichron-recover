import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalAnalyticsController } from './analytics.internal.controller';
import { InternalAnalyticsService } from './analytics.service';
import { TransactionHistory } from '../../transactions/entities/transaction-history.entity';
import { PaymentPlan } from '../../payment-plans/entities/payment-plan.entity';
import { PaymentPlanDebt } from '../../payment-plans/entities/payment-plan-debt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TransactionHistory, PaymentPlan, PaymentPlanDebt])],
  controllers: [InternalAnalyticsController],
  providers: [InternalAnalyticsService],
  exports: [InternalAnalyticsService],
})
export class InternalAnalyticsModule {}
