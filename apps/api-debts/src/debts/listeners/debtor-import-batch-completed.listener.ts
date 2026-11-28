import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DebtDebtor } from '../entities/debt-debtor.entity';
import {
  EVENT_TOPICS,
  EVENT_TYPES,
  type EventEnvelope,
} from '@verichron/events';
import { ImportBatchCompletedDto } from '../../events/event-dto/debtors/import-batch-completed.dto';

/**
 * Debtor Import Batch Completed Event Listener
 *
 * Subscribes to ImportBatchCompleted events from api-debtors and creates
 * debt-debtor associations after a batch of debtors has been processed.
 *
 * **Purpose:**
 * When api-debtors completes processing a batch of debtors during portfolio
 * import, this listener links those debtors to their corresponding debts by
 * creating DebtDebtor records.
 *
 * **Workflow:**
 * 1. Receive ImportBatchCompleted event with debtor mappings
 * 2. For each successful debtor mapping:
 *    - Extract debtIds and debtorProfileId
 *    - Create DebtDebtor records (debt-to-debtor associations)
 * 3. Skip debtors that failed processing (errors array)
 *
 * **Event Source:** api-debtors
 * **Event Type:** debtors.import_batch.completed
 * **Subscription:** api-debts.debtor-import-batch-completed.sub
 *
 * **Data Flow:**
 * 1. Portfolio import starts in api-debts
 * 2. api-debts publishes debtor batches → api-debtors processes
 * 3. api-debtors creates DebtorIdentity and DebtorProfile records
 * 4. api-debtors publishes ImportBatchCompleted with mappings
 * 5. This listener creates DebtDebtor links (debt ↔ debtorProfile)
 *
 * **Performance:**
 * - Batch inserts for efficiency
 * - Idempotent via unique index on (debtId, debtorProfileId)
 * - Failed debtors gracefully skipped (logged for review)
 *
 * **Error Handling:**
 * - Duplicate associations ignored (constraint violation)
 * - Missing debts logged as warnings (should not happen)
 * - Entire batch retries on fatal errors via Pub/Sub
 */
@Injectable()
export class DebtorImportBatchCompletedListener extends AbstractBaseListener<ImportBatchCompletedDto> {
  constructor(
    @InjectRepository(DebtDebtor)
    private readonly debtDebtorRepository: Repository<DebtDebtor>,
  ) {
    super();
  }

  /**
   * Handle ImportBatchCompleted event.
   *
   * Process:
   * 1. Extract debtor mappings from event
   * 2. Create DebtDebtor records for each debt-to-debtor association
   * 3. Log completion and errors for monitoring
   *
   * Error Handling:
   * - Throws error on processing failures to trigger retry via GCP Pub/Sub
   * - Individual constraint violations logged but don't fail batch
   *
   * @param event - ImportBatchCompleted event envelope
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTORS,
    eventType: EVENT_TYPES.DEBTORS_IMPORT_BATCH_COMPLETED,
    dto: ImportBatchCompletedDto,
  })
  async onMessage(
    data: ImportBatchCompletedDto,
    envelope: EventEnvelope<ImportBatchCompletedDto>,
  ): Promise<void> {
    const {
      importJobId,
      portfolioId,
      organizationId,
      batchNumber,
      debtorMappings,
      errors,
      successCount,
      failureCount,
    } = data;

    this.logger.log(
      `Processing debtor import batch completion for batch ${batchNumber} ${JSON.stringify({
        eventId: envelope.eventId,
        importJobId,
        portfolioId,
        organizationId,
        batchNumber,
        successCount,
        failureCount,
      })}`,
    );

    // Prepare debt-debtor associations for batch insert
    const debtDebtorRecords: Partial<DebtDebtor>[] = [];

    for (const mapping of debtorMappings) {
      const { debtorProfileId, debtIds } = mapping;

      // Create an association for each debt linked to this debtor
      for (const debtId of debtIds) {
        debtDebtorRecords.push({
          debtId,
          debtorProfileId,
        });
      }
    }

    if (debtDebtorRecords.length === 0) {
      this.logger.warn(
        `No debt-debtor associations to create for batch ${batchNumber} ${JSON.stringify({
          importJobId,
          portfolioId,
          batchNumber,
          mappingsCount: debtorMappings.length,
        })}`,
      );
      return;
    }

    this.logger.log(
      `Creating ${debtDebtorRecords.length} debt-debtor associations ${JSON.stringify({
        importJobId,
        portfolioId,
        batchNumber,
        associationsCount: debtDebtorRecords.length,
      })}`,
    );

    // Batch insert debt-debtor associations
    // Note: Using 'orIgnore' to handle duplicate associations gracefully
    // (can happen if batch is reprocessed due to retry)
    const insertResult = await this.debtDebtorRepository
      .createQueryBuilder()
      .insert()
      .into(DebtDebtor)
      .values(debtDebtorRecords)
      .orIgnore() // Skip duplicates (unique constraint on debtId + debtorProfileId)
      .execute();

    const insertedCount = insertResult.identifiers.length;

    this.logger.log(
      `Successfully created debt-debtor associations for batch ${batchNumber} ${JSON.stringify({
        eventId: envelope.eventId,
        importJobId,
        portfolioId,
        organizationId,
        batchNumber,
        totalAssociations: debtDebtorRecords.length,
        insertedCount,
        skippedCount: debtDebtorRecords.length - insertedCount,
        successfulDebtors: successCount,
        failedDebtors: failureCount,
      })}`,
    );

    // Log failed debtors for monitoring and review
    if (errors.length > 0) {
      this.logger.warn(
        `Batch ${batchNumber} had ${errors.length} failed debtors ${JSON.stringify({
          importJobId,
          portfolioId,
          batchNumber,
          errors: errors.map((e) => ({
            debtorKey: e.debtorKey,
            error: e.error,
            debtIdsAffected: e.debtIds.length,
            willRetry: e.willRetry,
          })),
        })}`,
      );
    }
  }
}
