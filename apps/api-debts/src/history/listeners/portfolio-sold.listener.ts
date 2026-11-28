import { Injectable } from '@nestjs/common';
import { AbstractBaseListener, EventSubscription } from '@verichron/event-subscriber';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoryService } from '../debt-ownership-history.service';
import { Debt } from '../../debts/entities/debt.entity';
import { EVENT_TOPICS, EVENT_TYPES, type EventEnvelope } from '@verichron/events';
import { PortfolioSoldDto } from '../../events/event-dto/portfolios/portfolio-sold.dto';

/**
 * Portfolio Sold Event Listener
 *
 * Subscribes to PortfolioSold events and creates ownership history records
 * for all debts in the transferred portfolio.
 *
 * **Critical Workflow:**
 * When a portfolio is sold (ownership transferred between organizations):
 * 1. Close current ownership records for all debts in the portfolio (set soldDate)
 * 2. Create new ownership records for all debts under the new organization
 *
 * This ensures:
 * - Complete chain of title for legal compliance
 * - Audit trail for FDCPA requirements
 * - Historical tracking of debt ownership changes
 *
 * Event Source: api-debts (PortfoliosService.transfer())
 * Event Type: debts.portfolio.sold
 * Subscription: api-debts.portfolio-sold.history.sub
 */
@Injectable()
export class PortfolioSoldListener extends AbstractBaseListener<PortfolioSoldDto> {
  constructor(
    private readonly historyService: HistoryService,
    @InjectRepository(Debt)
    private readonly debtRepository: Repository<Debt>,
  ) {
    super();
  }

  /**
   * Handle PortfolioSold event.
   *
   * Process:
   * 1. Fetch all debts in the portfolio
   * 2. Close current ownership records for all debts (set soldDate)
   * 3. Create new ownership records for all debts under new organization
   * 4. Log completion for audit trail
   *
   * Error Handling:
   * - Throws error on failure to trigger retry via GCP Pub/Sub
   * - Transaction rollback handled by HistoryService methods
   *
   * @param event - PortfolioSold event envelope
   */
  @EventSubscription({
    topicName: EVENT_TOPICS.DEBTS,
    eventType: EVENT_TYPES.DEBTS_PORTFOLIO_SOLD,
    dto: PortfolioSoldDto,
  })
  async onMessage(data: PortfolioSoldDto, envelope: EventEnvelope<PortfolioSoldDto>): Promise<void> {
    const { portfolioId, previousOrganizationId, newOrganizationId, transferDate, soldAt } =
      data;

    // 1. Fetch all debts in the portfolio
    // Note: We don't filter by organizationId here because the portfolio
    // has already been updated to the new organizationId in the database
    const debts = await this.debtRepository.find({
      where: { portfolioId },
      select: ['id'],
    });

    if (debts.length === 0) {
      this.logger.warn(`No debts found for portfolio ${portfolioId}`, {
        eventId: envelope.eventId,
        portfolioId,
      });
      return;
    }

    const debtIds = debts.map((debt) => debt.id);

    this.logger.log(`Found ${debtIds.length} debts to transfer ownership`, {
      portfolioId,
      debtCount: debtIds.length,
    });

    // 2. Close current ownership records (set soldDate)
    const closedCount = await this.historyService.closeOwnershipRecords(
      debtIds,
      transferDate,
    );

    this.logger.log(`Closed ${closedCount} ownership records`, {
      portfolioId,
      closedCount,
    });

    // 3. Create new ownership records for the new organization
    const newOwnershipRecords = debtIds.map((debtId) => ({
      debtId,
      organizationId: newOrganizationId,
      acquiredDate: transferDate,
      soldDate: null, // Current ownership (open-ended)
      source: 'PORTFOLIO_TRANSFER',
    }));

    const createdRecords = await this.historyService.bulkCreateHistoryRecords(
      newOwnershipRecords,
    );

    this.logger.log(
      `Successfully processed PortfolioSold event for portfolio ${portfolioId}`,
      {
        eventId: envelope.eventId,
        portfolioId,
        debtCount: debtIds.length,
        closedRecords: closedCount,
        createdRecords: createdRecords.length,
        previousOrganizationId,
        newOrganizationId,
        transferDate,
      },
    );
  }
}
