import { Injectable } from '@nestjs/common';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { PortfolioDebtorBatchReadyDto } from '../../events/event-dto/debts/portfolio-debtor-batch-ready.dto';
import { DebtorImportProcessor } from '../debtor-import-processor.service';


/**
 * PortfolioDebtorBatchReady Event Listener
 *
 * Subscribes to PortfolioDebtorBatchReady events from api-debts and processes
 * batches of debtors during portfolio import.
 *
 * **Purpose:**
 * When api-debts publishes a batch of debtors during portfolio import, this
 * listener processes the batch to create/update DebtorIdentity and DebtorProfile
 * records.
 */
@Injectable()
export class PortfolioDebtorBatchReadyListener extends AbstractBaseListener<PortfolioDebtorBatchReadyDto> {
  constructor(private readonly moduleRef: ModuleRef) {
    super();
    
    this.logger.log('🎯 PortfolioDebtorBatchReadyListener instantiated (Singleton with Dynamic Resolution)');
  }

  /**
   * Handle PortfolioDebtorBatchReady event.
   *
   * Process:
   * 1. Extract batch data from event
   * 2. Pass to DebtorImportProcessor for processing
   * 3. Log completion for monitoring
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_PORTFOLIO_DEBTOR_BATCH_READY,
    dto: PortfolioDebtorBatchReadyDto,
  })
  async onMessage(data: PortfolioDebtorBatchReadyDto, envelope: EventEnvelope<PortfolioDebtorBatchReadyDto>): Promise<void> {
    this.logger.log(
      `📨 Received debtor batch ${data.batchNumber}/${data.totalBatches} ` +
      `for portfolio ${data.portfolioId} (Event: ${envelope.eventId})`
    );

    // Debug logging for batch metadata
    this.logger.debug('Batch metadata:', {
      batchNumber: data.batchNumber,
      totalBatches: data.totalBatches,
      debtorCount: data.debtors.length,
      portfolioId: data.portfolioId,
      organizationId: data.organizationId,
    });

    // Log first debtor as sample (avoid spamming logs with all 30)
    if (data.debtors.length > 0) {
      this.logger.debug('First debtor sample:', JSON.stringify(data.debtors[0], null, 2));
    }

    // Safety check before processing
    this.logger.debug(`Resolving DebtorImportProcessor for this event context...`);
    
    // DO NOT ERASE:
    // This dynamic resolution via ModuleRef is INTENTIONAL and CRITICAL for system stability.
    // 
    // Architecture Explanation:
    // 1. SubscriberDiscoveryService requires all Listeners (this class) to be Singleton Singletons.
    // 2. DebtorImportProcessor is Request-Scoped (to handle transactional isolation per batch).
    // 3. NestJS CANNOT inject a Request-Scoped service into a Singleton constructor.
    // 
    // Solution:
    // We inject ModuleRef in the constructor and dynamically resolve a fresh, scoped instance
    // of the processor for EACH event using ContextIdFactory.create().
    // This allows the Listener to remain a valid Singleton while ensuring each batch
    // gets its own isolated processor and transaction context.
    const contextId = ContextIdFactory.create();
    const processor = await this.moduleRef.resolve(DebtorImportProcessor, contextId, { strict: false });

    // Delegate to processor - let it handle all business logic
    this.logger.log(`⚙️  Processing batch ${data.batchNumber} with ${data.debtors.length} debtors...`);
    
    try {
      await processor.processBatchFromEvent(data);
      
      this.logger.log(
        `✅ Successfully processed debtor batch ${data.batchNumber}/${data.totalBatches} ` +
        `for portfolio ${data.portfolioId}`
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to process batch ${data.batchNumber}/${data.totalBatches}:`,
        error
      );
      throw error; // Re-throw to trigger Pub/Sub nack and retry
    }
  }
}