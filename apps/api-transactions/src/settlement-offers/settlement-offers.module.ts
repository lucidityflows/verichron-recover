import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventPublisherModule } from '@verichron/event-publisher';
import { SettlementOffersService } from './settlement-offers.service';
import { SettlementOffersController } from './settlement-offers.controller';
import { SettlementOffer } from './entities/settlement-offer.entity';

/**
 * Settlement Offers Module
 *
 * Manages debt settlement offers and negotiation tracking.
 * Supports multiple offers per debt for full negotiation history.
 *
 * BOUNDED CONTEXT:
 * - Owned by: api-transactions (financial agreements)
 * - Related to: Debt entity in api-debts (debtId FK)
 * - Related to: Document entity (for settlement agreements)
 *
 * KEY FEATURES:
 * - Multiple Offers Per Debt: Track negotiation history
 * - Bidirectional Offers: CREDITOR or DEBTOR initiated
 * - Payment Structures: LUMP_SUM or INSTALLMENT with terms
 * - Status Lifecycle: PENDING → ACCEPTED → COMPLETED (or REJECTED/EXPIRED/DEFAULTED)
 * - Document Linkage: Settlement agreements via Document entity
 * - Audit Trail: Who created, who resolved, when, why
 *
 * USE CASES:
 * - Collector offers 60% settlement
 * - Debtor counter-offers 40%
 * - Final acceptance at 50%
 * - Track completion or default
 * - Full negotiation audit trail
 *
 * ANALYTICS USAGE:
 * - Acceptance rate by collector
 * - Average settlement percentage
 * - Time to acceptance
 * - Default rate on accepted settlements
 *
 * Entities:
 * - SettlementOffer: Individual settlement proposals and outcomes
 *
 * Services:
 * - SettlementOffersService: CRUD, acceptance workflow, analytics
 *
 * Dependencies:
 * - TypeORM for database access
 * - EventPublisherModule for publishing settlement events
 *
 * Exports:
 * - SettlementOffersService: Available for debt management and analytics
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([SettlementOffer]),
    EventPublisherModule,
  ],
  controllers: [SettlementOffersController],
  providers: [SettlementOffersService],
  exports: [SettlementOffersService],
})
export class SettlementOffersModule {}
