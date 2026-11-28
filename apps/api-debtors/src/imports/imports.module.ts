import { Module } from '@nestjs/common';
import { DebtorImportProcessor } from './debtor-import-processor.service';
import { PortfolioDebtorBatchReadyListener } from './listeners/portfolio-debtor-batch-ready.listener';
import { IdentityModule } from '../identity/identity.module';
import { ContactModule } from '../contact/contact.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { EventsModule } from '../events/events.module';

/**
 * Imports Module
 *
 * SINGLE RESPONSIBILITY: Process debtor data from portfolio imports
 *
 * This module handles:
 * - Subscribing to portfolio.debtor_batch_ready events
 * - Batch processing of debtor data
 * - Orchestrating identity matching, profile creation, contact creation
 * - Publishing batch completion events
 * - Retry logic and error handling
 *
 * Event Flow:
 * 1. SUBSCRIBES TO: debts.portfolio.debtor_batch_ready
 *    - Triggered when api-debts publishes a batch of debtors during import
 *    - Contains: importJobId, portfolioId, organizationId, debtors batch
 *
 * 2. PROCESSES:
 *    - Processes batches pushed by api-debts
 *    - For each debtor:
 *      a. Find or create DebtorIdentity (via IdentityModule)
 *      b. Find or create DebtorProfile (via ProfilesModule)
 *      c. Create contact info (via ContactModule)
 *
 * 3. PUBLISHES: debtors.import_batch.completed (per batch)
 *    - Contains: batch results, debtor mappings, errors
 *    - Consumed by api-debts to update debt-debtor associations
 *
 * Dependencies:
 * - IdentityModule: For identity matching and deduplication
 * - ProfilesModule: For creating debtor profiles
 * - ContactModule: For creating address/email/phone records
 * - EventsModule: For EventPublisher (used by DebtorImportProcessor)
 *
 * Note: Even though EventsModule is @Global, it must be explicitly imported here
 * so that NestJS can resolve EventPublisher when instantiating DebtorImportProcessor.
 *
 * Example Flow:
 * Stark Industries imports 10,000 debtor portfolio:
 * 1. api-debts publishes 100 batches of 100 debtors each (portfolio.debtor_batch_ready)
 * 2. PortfolioDebtorBatchReadyListener receives batches via Pub/Sub
 * 3. DebtorImportProcessor processes each batch
 * 4. Each batch publishes import_batch.completed event
 * 5. api-debts subscribes to batch events and updates debts with debtor IDs
 */
@Module({
  imports: [
    IdentityModule,
    ProfilesModule,
    ContactModule,
    EventsModule, // Required even though @Global - needed for EventPublisher injection in DebtorImportProcessor
  ],
  providers: [
    DebtorImportProcessor,
    PortfolioDebtorBatchReadyListener,
  ],
  exports: [DebtorImportProcessor],
})
export class ImportsModule {}