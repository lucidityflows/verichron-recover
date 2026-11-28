import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettlementOffer } from './entities/settlement-offer.entity';
import { SettlementOfferStatus } from '@verichron/enums';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TOPICS, EVENT_TYPES, EVENT_SOURCES } from '@verichron/events';
import {
  SettlementOfferCreatedDto,
  SettlementOfferAcceptedDto,
  SettlementOfferRejectedDto,
  SettlementOfferCompletedDto,
  SettlementOfferDefaultedDto,
} from '../events/event-dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Settlement Offers Service
 *
 * Manages debt settlement offers and negotiation workflow.
 * Supports multiple offers per debt for complete negotiation history.
 *
 * KEY OPERATIONS:
 * - createOffer: Create new settlement proposal
 * - acceptOffer: Debtor/creditor accepts settlement
 * - rejectOffer: Debtor/creditor rejects settlement
 * - completeOffer: Mark settlement as fully paid
 * - getOfferHistory: Retrieve all offers for a debt
 * - getOfferAnalytics: Calculate acceptance rates and statistics
 */
@Injectable()
export class SettlementOffersService {
  private readonly logger = new Logger(SettlementOffersService.name);

  constructor(
    @InjectRepository(SettlementOffer)
    private readonly settlementOfferRepository: Repository<SettlementOffer>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Create a new settlement offer
   *
   * @param offerData - Settlement offer details
   * @returns Created SettlementOffer record
   */
  async createOffer(params: {
    organizationId: string;
    debtId: string;
    offeredBy: 'CREDITOR' | 'DEBTOR';
    originalBalance: number;
    settlementAmount: number;
    paymentStructure: 'LUMP_SUM' | 'INSTALLMENT';
    installmentCount?: number;
    installmentAmount?: number;
    installmentFrequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    offerDate: Date;
    expirationDate?: Date;
    notes?: string;
    createdBy?: string;
  }): Promise<SettlementOffer> {
    const {
      organizationId,
      debtId,
      offeredBy,
      originalBalance,
      settlementAmount,
      paymentStructure,
      installmentCount = null,
      installmentAmount = null,
      installmentFrequency = null,
      offerDate,
      expirationDate = null,
      notes = null,
      createdBy = null,
    } = params;

    // Calculate settlement percentage
    const settlementPercentage =
      originalBalance > 0 ? (settlementAmount / originalBalance) * 100 : 0;

    // Create settlement offer record
    const settlementOffer = this.settlementOfferRepository.create({
      organizationId,
      debtId,
      offeredBy,
      originalBalance: originalBalance.toString(),
      settlementAmount: settlementAmount.toString(),
      settlementPercentage: settlementPercentage.toFixed(2),
      paymentStructure,
      installmentCount,
      installmentAmount: installmentAmount ? installmentAmount.toString() : null,
      installmentFrequency,
      status: SettlementOfferStatus.PENDING,
      offerDate,
      expirationDate,
      notes,
      createdBy,
    });

    const saved = await this.settlementOfferRepository.save(settlementOffer);

    this.logger.log(
      `Created ${offeredBy} settlement offer for debt ${debtId}: $${settlementAmount.toFixed(2)} (${settlementPercentage.toFixed(1)}% of $${originalBalance.toFixed(2)})`,
    );

    // Publish SETTLEMENT_OFFER_CREATED event
    await this.publishSettlementOfferCreatedEvent(saved);

    return saved;
  }

  /**
   * Accept a settlement offer
   *
   * Changes status from PENDING to ACCEPTED
   *
   * @param offerId - SettlementOffer ID
   * @param resolvedBy - User ID who accepted
   * @param resolutionDate - Date of acceptance
   * @returns Updated SettlementOffer
   */
  async acceptOffer(
    offerId: string,
    resolvedBy: string,
    resolutionDate: Date = new Date(),
  ): Promise<SettlementOffer> {
    const offer = await this.settlementOfferRepository.findOne({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException(`SettlementOffer with ID ${offerId} not found`);
    }

    if (offer.status !== SettlementOfferStatus.PENDING) {
      throw new Error(
        `Cannot accept settlement offer ${offerId} - current status is ${offer.status}, expected PENDING`,
      );
    }

    offer.status = SettlementOfferStatus.ACCEPTED;
    offer.resolvedBy = resolvedBy;
    offer.resolutionDate = resolutionDate;

    const updated = await this.settlementOfferRepository.save(offer);

    this.logger.log(
      `Accepted settlement offer ${offerId} for debt ${offer.debtId} - $${offer.settlementAmount} settlement`,
    );

    // Publish SETTLEMENT_OFFER_ACCEPTED event
    await this.publishSettlementOfferAcceptedEvent(updated);

    return updated;
  }

  /**
   * Reject a settlement offer
   *
   * Changes status from PENDING to REJECTED
   *
   * @param offerId - SettlementOffer ID
   * @param resolvedBy - User ID who rejected
   * @param resolutionDate - Date of rejection
   * @returns Updated SettlementOffer
   */
  async rejectOffer(
    offerId: string,
    resolvedBy: string,
    resolutionDate: Date = new Date(),
  ): Promise<SettlementOffer> {
    const offer = await this.settlementOfferRepository.findOne({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException(`SettlementOffer with ID ${offerId} not found`);
    }

    if (offer.status !== SettlementOfferStatus.PENDING) {
      throw new Error(
        `Cannot reject settlement offer ${offerId} - current status is ${offer.status}, expected PENDING`,
      );
    }

    offer.status = SettlementOfferStatus.REJECTED;
    offer.resolvedBy = resolvedBy;
    offer.resolutionDate = resolutionDate;

    const updated = await this.settlementOfferRepository.save(offer);

    this.logger.log(
      `Rejected settlement offer ${offerId} for debt ${offer.debtId}`,
    );

    // Publish SETTLEMENT_OFFER_REJECTED event
    await this.publishSettlementOfferRejectedEvent(updated);

    return updated;
  }

  /**
   * Complete a settlement offer (fully paid)
   *
   * Changes status from ACCEPTED to COMPLETED
   *
   * @param offerId - SettlementOffer ID
   * @param completionDate - Date settlement was fully paid
   * @returns Updated SettlementOffer
   */
  async completeOffer(
    offerId: string,
    completionDate: Date = new Date(),
  ): Promise<SettlementOffer> {
    const offer = await this.settlementOfferRepository.findOne({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException(`SettlementOffer with ID ${offerId} not found`);
    }

    if (offer.status !== SettlementOfferStatus.ACCEPTED) {
      throw new Error(
        `Cannot complete settlement offer ${offerId} - current status is ${offer.status}, expected ACCEPTED`,
      );
    }

    offer.status = SettlementOfferStatus.COMPLETED;
    offer.completionDate = completionDate;

    const updated = await this.settlementOfferRepository.save(offer);

    this.logger.log(
      `Completed settlement offer ${offerId} for debt ${offer.debtId} - settlement fully paid`,
    );

    // Publish SETTLEMENT_OFFER_COMPLETED event
    await this.publishSettlementOfferCompletedEvent(updated);

    return updated;
  }

  /**
   * Mark settlement offer as defaulted
   *
   * Changes status from ACCEPTED to DEFAULTED (debtor failed to pay)
   *
   * @param offerId - SettlementOffer ID
   * @returns Updated SettlementOffer
   */
  async defaultOffer(offerId: string): Promise<SettlementOffer> {
    const offer = await this.settlementOfferRepository.findOne({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException(`SettlementOffer with ID ${offerId} not found`);
    }

    if (offer.status !== SettlementOfferStatus.ACCEPTED) {
      throw new Error(
        `Cannot default settlement offer ${offerId} - current status is ${offer.status}, expected ACCEPTED`,
      );
    }

    offer.status = SettlementOfferStatus.DEFAULTED;

    const updated = await this.settlementOfferRepository.save(offer);

    this.logger.log(
      `Defaulted settlement offer ${offerId} for debt ${offer.debtId} - debtor failed to honor payment terms`,
    );

    // Publish SETTLEMENT_OFFER_DEFAULTED event
    await this.publishSettlementOfferDefaultedEvent(updated);

    return updated;
  }

  /**
   * Expire a pending settlement offer
   *
   * Changes status from PENDING to EXPIRED (deadline passed without response)
   *
   * @param offerId - SettlementOffer ID
   * @returns Updated SettlementOffer
   */
  async expireOffer(offerId: string): Promise<SettlementOffer> {
    const offer = await this.settlementOfferRepository.findOne({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException(`SettlementOffer with ID ${offerId} not found`);
    }

    if (offer.status !== SettlementOfferStatus.PENDING) {
      throw new Error(
        `Cannot expire settlement offer ${offerId} - current status is ${offer.status}, expected PENDING`,
      );
    }

    offer.status = SettlementOfferStatus.EXPIRED;
    offer.resolutionDate = new Date();

    const updated = await this.settlementOfferRepository.save(offer);

    this.logger.log(
      `Expired settlement offer ${offerId} for debt ${offer.debtId} - deadline passed without response`,
    );

    return updated;
  }

  /**
   * Withdraw a pending settlement offer
   *
   * Changes status from PENDING to WITHDRAWN (creditor/collector retracts offer)
   *
   * @param offerId - SettlementOffer ID
   * @param resolvedBy - User ID who withdrew offer
   * @returns Updated SettlementOffer
   */
  async withdrawOffer(
    offerId: string,
    resolvedBy: string,
  ): Promise<SettlementOffer> {
    const offer = await this.settlementOfferRepository.findOne({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException(`SettlementOffer with ID ${offerId} not found`);
    }

    if (offer.status !== SettlementOfferStatus.PENDING) {
      throw new Error(
        `Cannot withdraw settlement offer ${offerId} - current status is ${offer.status}, expected PENDING`,
      );
    }

    offer.status = SettlementOfferStatus.WITHDRAWN;
    offer.resolvedBy = resolvedBy;
    offer.resolutionDate = new Date();

    const updated = await this.settlementOfferRepository.save(offer);

    this.logger.log(
      `Withdrew settlement offer ${offerId} for debt ${offer.debtId}`,
    );

    return updated;
  }

  /**
   * Get all settlement offers for a debt
   *
   * Returns complete negotiation history ordered by date (newest first)
   */
  async getOfferHistory(debtId: string): Promise<SettlementOffer[]> {
    return this.settlementOfferRepository.find({
      where: { debtId },
      order: { offerDate: 'DESC' },
    });
  }

  /**
   * Get active (PENDING or ACCEPTED) settlement offer for a debt
   *
   * Returns the most recent active offer, or null if none
   */
  async getActiveOffer(debtId: string): Promise<SettlementOffer | null> {
    return this.settlementOfferRepository.findOne({
      where: [
        { debtId, status: SettlementOfferStatus.PENDING },
        { debtId, status: SettlementOfferStatus.ACCEPTED },
      ],
      order: { offerDate: 'DESC' },
    });
  }

  /**
   * Get all pending settlement offers for an organization
   */
  async getPendingOffers(organizationId: string): Promise<SettlementOffer[]> {
    return this.settlementOfferRepository.find({
      where: {
        organizationId,
        status: SettlementOfferStatus.PENDING,
      },
      order: { offerDate: 'DESC' },
    });
  }

  /**
   * Get settlement offer analytics for an organization
   *
   * Returns aggregate metrics for reporting
   */
  async getOfferAnalytics(organizationId: string): Promise<{
    totalOffers: number;
    pendingOffers: number;
    acceptedOffers: number;
    completedOffers: number;
    rejectedOffers: number;
    expiredOffers: number;
    defaultedOffers: number;
    acceptanceRate: number;
    completionRate: number;
    defaultRate: number;
    avgSettlementPercentage: number;
    avgTimeToAcceptance: number; // days
  }> {
    const offers = await this.settlementOfferRepository.find({
      where: { organizationId },
    });

    const totalOffers = offers.length;
    const pendingOffers = offers.filter(
      (o) => o.status === SettlementOfferStatus.PENDING,
    ).length;
    const acceptedOffers = offers.filter(
      (o) => o.status === SettlementOfferStatus.ACCEPTED,
    ).length;
    const completedOffers = offers.filter(
      (o) => o.status === SettlementOfferStatus.COMPLETED,
    ).length;
    const rejectedOffers = offers.filter(
      (o) => o.status === SettlementOfferStatus.REJECTED,
    ).length;
    const expiredOffers = offers.filter(
      (o) => o.status === SettlementOfferStatus.EXPIRED,
    ).length;
    const defaultedOffers = offers.filter(
      (o) => o.status === SettlementOfferStatus.DEFAULTED,
    ).length;

    const totalResolved = acceptedOffers + rejectedOffers + expiredOffers;
    const acceptanceRate =
      totalResolved > 0 ? (acceptedOffers / totalResolved) * 100 : 0;

    const totalAccepted = acceptedOffers + completedOffers + defaultedOffers;
    const completionRate =
      totalAccepted > 0 ? (completedOffers / totalAccepted) * 100 : 0;

    const defaultRate =
      totalAccepted > 0 ? (defaultedOffers / totalAccepted) * 100 : 0;

    const avgSettlementPercentage =
      offers.length > 0
        ? offers.reduce((sum, o) => sum + parseFloat(o.settlementPercentage), 0) /
          offers.length
        : 0;

    // Calculate average time from offer to acceptance (in days)
    const acceptedWithDates = offers.filter(
      (o) =>
        o.status === SettlementOfferStatus.ACCEPTED && o.resolutionDate,
    );
    const avgTimeToAcceptance =
      acceptedWithDates.length > 0
        ? acceptedWithDates.reduce((sum, o) => {
            const days = Math.floor(
              (o.resolutionDate!.getTime() - o.offerDate.getTime()) /
                (1000 * 60 * 60 * 24),
            );
            return sum + days;
          }, 0) / acceptedWithDates.length
        : 0;

    return {
      totalOffers,
      pendingOffers,
      acceptedOffers,
      completedOffers,
      rejectedOffers,
      expiredOffers,
      defaultedOffers,
      acceptanceRate,
      completionRate,
      defaultRate,
      avgSettlementPercentage,
      avgTimeToAcceptance,
    };
  }

  /**
   * Find settlement offer by ID
   */
  async findById(id: string): Promise<SettlementOffer> {
    const offer = await this.settlementOfferRepository.findOne({
      where: { id },
    });

    if (!offer) {
      throw new NotFoundException(`SettlementOffer with ID ${id} not found`);
    }

    return offer;
  }

  /**
   * Publish SettlementOfferCreated event
   */
  private async publishSettlementOfferCreatedEvent(
    offer: SettlementOffer,
  ): Promise<void> {
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TRANSACTIONS_SETTLEMENT_OFFER_CREATED,
        {
          settlementOfferId: offer.id,
          debtId: offer.debtId,
          organizationId: offer.organizationId,
          offeredBy: offer.offeredBy,
          originalBalance: parseFloat(offer.originalBalance),
          settlementAmount: parseFloat(offer.settlementAmount),
          settlementPercentage: parseFloat(offer.settlementPercentage),
          paymentStructure: offer.paymentStructure,
          offerDate: offer.offerDate.toISOString(),
          expirationDate: offer.expirationDate?.toISOString() || null,
          createdAt: offer.createdAt.toISOString(),
        },
        SettlementOfferCreatedDto,
      );

      this.logger.debug(
        `Published TRANSACTIONS_SETTLEMENT_OFFER_CREATED event for offer ${offer.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish SettlementOfferCreated event for offer ${offer.id}`,
        error,
      );
    }
  }

  /**
   * Publish SettlementOfferAccepted event
   */
  private async publishSettlementOfferAcceptedEvent(
    offer: SettlementOffer,
  ): Promise<void> {
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TRANSACTIONS_SETTLEMENT_OFFER_ACCEPTED,
        {
          settlementOfferId: offer.id,
          debtId: offer.debtId,
          organizationId: offer.organizationId,
          settlementAmount: parseFloat(offer.settlementAmount),
          paymentStructure: offer.paymentStructure,
          resolvedBy: offer.resolvedBy || '',
          resolutionDate: offer.resolutionDate?.toISOString() || new Date().toISOString(),
          acceptedAt: new Date().toISOString(),
        },
        SettlementOfferAcceptedDto,
      );

      this.logger.debug(
        `Published TRANSACTIONS_SETTLEMENT_OFFER_ACCEPTED event for offer ${offer.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish SettlementOfferAccepted event for offer ${offer.id}`,
        error,
      );
    }
  }

  /**
   * Publish SettlementOfferRejected event
   */
  private async publishSettlementOfferRejectedEvent(
    offer: SettlementOffer,
  ): Promise<void> {
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TRANSACTIONS_SETTLEMENT_OFFER_REJECTED,
        {
          settlementOfferId: offer.id,
          debtId: offer.debtId,
          organizationId: offer.organizationId,
          resolvedBy: offer.resolvedBy || '',
          resolutionDate: offer.resolutionDate?.toISOString() || new Date().toISOString(),
          rejectedAt: new Date().toISOString(),
        },
        SettlementOfferRejectedDto,
      );

      this.logger.debug(
        `Published TRANSACTIONS_SETTLEMENT_OFFER_REJECTED event for offer ${offer.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish SettlementOfferRejected event for offer ${offer.id}`,
        error,
      );
    }
  }

  /**
   * Publish SettlementOfferCompleted event
   */
  private async publishSettlementOfferCompletedEvent(
    offer: SettlementOffer,
  ): Promise<void> {
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TRANSACTIONS_SETTLEMENT_OFFER_COMPLETED,
        {
          settlementOfferId: offer.id,
          debtId: offer.debtId,
          organizationId: offer.organizationId,
          settlementAmount: parseFloat(offer.settlementAmount),
          completionDate: offer.completionDate?.toISOString() || new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        SettlementOfferCompletedDto,
      );

      this.logger.debug(
        `Published TRANSACTIONS_SETTLEMENT_OFFER_COMPLETED event for offer ${offer.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish SettlementOfferCompleted event for offer ${offer.id}`,
        error,
      );
    }
  }

  /**
   * Publish SettlementOfferDefaulted event
   */
  private async publishSettlementOfferDefaultedEvent(
    offer: SettlementOffer,
  ): Promise<void> {
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TRANSACTIONS_SETTLEMENT_OFFER_DEFAULTED,
        {
          settlementOfferId: offer.id,
          debtId: offer.debtId,
          organizationId: offer.organizationId,
          settlementAmount: parseFloat(offer.settlementAmount),
          defaultedAt: new Date().toISOString(),
        },
        SettlementOfferDefaultedDto,
      );

      this.logger.debug(
        `Published TRANSACTIONS_SETTLEMENT_OFFER_DEFAULTED event for offer ${offer.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish SettlementOfferDefaulted event for offer ${offer.id}`,
        error,
      );
    }
  }
}
