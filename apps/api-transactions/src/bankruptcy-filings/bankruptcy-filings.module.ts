import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventPublisherModule } from '@verichron/event-publisher';
import { BankruptcyFilingsService } from './bankruptcy-filings.service';
import { BankruptcyFiling } from './entities/bankruptcy-filing.entity';

/**
 * Bankruptcy Filings Module
 *
 * Manages bankruptcy case tracking for FDCPA compliance.
 * Supports multiple bankruptcy filings per debtor over time.
 *
 * BOUNDED CONTEXT:
 * - Owned by: api-transactions (legal proceedings)
 * - Related to: Debt entity in api-debts (debtId FK)
 * - Related to: DebtorProfile entity in api-debtors (debtorProfileId FK)
 * - Related to: Document entity (for petitions, discharge notices, schedules)
 *
 * CRITICAL FOR FDCPA COMPLIANCE:
 * - Automatic Stay: Collection MUST cease immediately upon FILED status
 * - Violations: Can result in sanctions, attorney fees, debtor damages
 * - Discharge: Debt legally eliminated, collection permanently prohibited
 * - Dismissal: Stay lifted, collection can resume
 *
 * KEY FEATURES:
 * - Multiple Filings Per Debtor: Track bankruptcy history over time
 * - Chapter Tracking: CHAPTER_7 (liquidation), CHAPTER_11 (reorganization), CHAPTER_13 (wage earner)
 * - Status Lifecycle: FILED → PENDING → DISCHARGED/DISMISSED/CONVERTED
 * - Compliance Tracking: Proof of claim filing, debt inclusion, discharge status
 * - Attorney Information: Track debtor's bankruptcy attorney for communication
 * - Document Linkage: Petitions, discharge notices, schedules via Document entity
 * - Important Dates: Filing, 341 meeting, proof of claim deadline, discharge/dismissal
 *
 * USE CASES:
 * - Debtor files Chapter 7 → Collection stops, debt discharged (no recovery)
 * - Debtor files Chapter 13 → Collection stops, debt in 5-year payment plan
 * - Bankruptcy dismissed → Collection resumes
 * - Multiple filings: Chapter 13 dismissed, later files Chapter 7
 * - Case conversion: Chapter 13 converted to Chapter 7
 *
 * FDCPA COMPLIANCE RULES:
 * - FILED/PENDING: STOP all collection immediately (automatic stay)
 * - DISCHARGED: STOP permanently (debt legally eliminated)
 * - DISMISSED: RESUME collection (case failed, debt remains)
 * - CONVERTED: STOP (still under bankruptcy protection)
 *
 * Entities:
 * - BankruptcyFiling: Individual bankruptcy cases with full details
 *
 * Services:
 * - BankruptcyFilingsService: CRUD, compliance checks, status tracking
 *
 * Dependencies:
 * - TypeORM for database access
 * - EventPublisherModule for publishing bankruptcy events
 *
 * Exports:
 * - BankruptcyFilingsService: Available for debt management and compliance checks
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([BankruptcyFiling]),
    EventPublisherModule,
  ],
  providers: [BankruptcyFilingsService],
  exports: [BankruptcyFilingsService],
})
export class BankruptcyFilingsModule {}
