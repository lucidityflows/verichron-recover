import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChargeOffsService } from './charge-offs.service';
import { ChargeOffHistory } from './entities/charge-off-history.entity';
import { Debt } from '../debts/entities/debt.entity';
import { EventsModule } from '../events/events.module';

/**
 * Charge-Offs Feature Module
 *
 * Manages charge-off history tracking for debts.
 * Supports multiple charge-offs per debt (rare but possible scenarios).
 *
 * BOUNDED CONTEXT:
 * - Owned by: api-debts
 * - Related to: Debt entity (debtId FK)
 *
 * WHAT IS A CHARGE-OFF:
 * - Creditor writes off debt as accounting loss (typically at 180 days delinquent)
 * - Does NOT mean debt is forgiven or legally uncollectible
 * - Creditor can still collect or sell debt after charge-off
 * - Stays on credit report for 7 years
 *
 * KEY FEATURES:
 * - Multiple Charge-Offs: Supports rare scenarios (debt recovered, then charged off again)
 * - Reason Tracking: DELINQUENCY_180_DAYS, BANKRUPTCY, DECEASED, FRAUD, SOL, etc.
 * - Recovery Tracking: Tracks charge-off reversals and recovery amounts
 * - Credit Bureau Reporting: Tracks whether/when reported
 * - Denormalized Current State: Debt entity has chargeOffDate field (most recent)
 *
 * USE CASES:
 * - Standard charge-off at 180 days delinquent
 * - Debt recovered (IN_COLLECTION), then charged off again
 * - Partial recovery via settlement, remaining balance charged off
 * - Bankruptcy charge-off (debt included in bankruptcy)
 * - Deceased debtor charge-off (no estate recovery)
 *
 * Entities:
 * - ChargeOffHistory: Individual charge-off events with balance breakdown
 *
 * Services:
 * - ChargeOffsService: CRUD operations, record charge-offs, track recovery
 *
 * Dependencies:
 * - TypeORM for database access
 * - Debt entity for denormalized chargeOffDate update
 * - EventsModule for publishing charge-off events (future)
 *
 * Exports:
 * - ChargeOffsService: Available for debt lifecycle management
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([ChargeOffHistory, Debt]),
    EventsModule,
  ],
  providers: [ChargeOffsService],
  exports: [ChargeOffsService],
})
export class ChargeOffsModule {}
