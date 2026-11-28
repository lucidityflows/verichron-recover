import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankruptcyFiling } from './entities/bankruptcy-filing.entity';
import { BankruptcyChapter, BankruptcyStatus } from '@verichron/enums';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TOPICS, EVENT_TYPES, EVENT_SOURCES } from '@verichron/events';
import {
  BankruptcyFiledDto,
  BankruptcyStatusUpdatedDto,
} from '../events/event-dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Bankruptcy Filings Service
 *
 * Manages bankruptcy case tracking and compliance monitoring.
 * CRITICAL for FDCPA compliance - automatic stay enforcement.
 *
 * KEY OPERATIONS:
 * - recordFiling: Record new bankruptcy case (triggers automatic stay)
 * - updateStatus: Update case status (discharge, dismissal, conversion)
 * - checkAutomaticStay: Verify if collection must cease for a debt/debtor
 * - getFilingHistory: Retrieve all bankruptcy filings for a debtor
 * - getComplianceReport: Generate compliance status report
 */
@Injectable()
export class BankruptcyFilingsService {
  private readonly logger = new Logger(BankruptcyFilingsService.name);

  constructor(
    @InjectRepository(BankruptcyFiling)
    private readonly bankruptcyFilingRepository: Repository<BankruptcyFiling>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Record a new bankruptcy filing
   *
   * Creates BankruptcyFiling record and triggers automatic stay enforcement.
   * Collection MUST cease immediately upon filing.
   *
   * @param filingData - Bankruptcy case details
   * @returns Created BankruptcyFiling record
   */
  async recordFiling(params: {
    organizationId: string;
    debtorProfileId: string;
    debtId?: string;
    chapter: BankruptcyChapter;
    caseNumber: string;
    courtDistrict: string;
    filingDate: Date;
    judgeName?: string;
    trusteeName?: string;
    meetingOfCreditorsDate?: Date;
    proofOfClaimDeadline?: Date;
    attorneyName?: string;
    attorneyPhone?: string;
    attorneyEmail?: string;
    debtIncludedInSchedules?: boolean;
    notes?: string;
    createdBy?: string;
    discoveryMethod?: string;
  }): Promise<BankruptcyFiling> {
    const {
      organizationId,
      debtorProfileId,
      debtId = null,
      chapter,
      caseNumber,
      courtDistrict,
      filingDate,
      judgeName = null,
      trusteeName = null,
      meetingOfCreditorsDate = null,
      proofOfClaimDeadline = null,
      attorneyName = null,
      attorneyPhone = null,
      attorneyEmail = null,
      debtIncludedInSchedules = false,
      notes = null,
      createdBy = null,
      discoveryMethod = null,
    } = params;

    // Create bankruptcy filing record
    const filing = this.bankruptcyFilingRepository.create({
      organizationId,
      debtorProfileId,
      debtId,
      chapter,
      status: BankruptcyStatus.FILED,
      caseNumber,
      courtDistrict,
      filingDate,
      judgeName,
      trusteeName,
      meetingOfCreditorsDate,
      proofOfClaimDeadline,
      attorneyName,
      attorneyPhone,
      attorneyEmail,
      debtIncludedInSchedules,
      proofOfClaimFiled: false,
      debtDischarged: false,
      notes,
      createdBy,
      discoveryMethod,
    });

    const saved = await this.bankruptcyFilingRepository.save(filing);

    this.logger.warn(
      `⚠️  AUTOMATIC STAY TRIGGERED - Bankruptcy ${chapter} filed for debtor ${debtorProfileId}: Case ${caseNumber} in ${courtDistrict}. COLLECTION MUST CEASE IMMEDIATELY.`,
    );

    // Publish BANKRUPTCY_FILED event
    // CRITICAL: Downstream systems MUST:
    // - Halt all collection activities immediately
    // - Cancel scheduled communications
    // - Flag all associated debts as "Under Bankruptcy Protection"
    // - Update debt status to reflect automatic stay
    // - Notify collectors via alerts
    await this.publishBankruptcyFiledEvent(saved);

    return saved;
  }

  /**
   * Update bankruptcy case status
   *
   * Handles status transitions: FILED → PENDING → DISCHARGED/DISMISSED/CONVERTED
   *
   * @param filingId - BankruptcyFiling ID
   * @param newStatus - New bankruptcy status
   * @param statusDate - Date of status change
   * @returns Updated BankruptcyFiling
   */
  async updateStatus(
    filingId: string,
    newStatus: BankruptcyStatus,
    statusDate: Date = new Date(),
  ): Promise<BankruptcyFiling> {
    const filing = await this.bankruptcyFilingRepository.findOne({
      where: { id: filingId },
    });

    if (!filing) {
      throw new NotFoundException(
        `BankruptcyFiling with ID ${filingId} not found`,
      );
    }

    const oldStatus = filing.status;
    filing.status = newStatus;

    // Update specific date fields based on status
    switch (newStatus) {
      case BankruptcyStatus.DISCHARGED:
        filing.dischargeDate = statusDate;
        filing.debtDischarged = true; // Assume debt discharged with case
        this.logger.warn(
          `⚠️  DISCHARGE GRANTED - Bankruptcy ${filing.caseNumber}: Debt legally eliminated. Collection PERMANENTLY PROHIBITED.`,
        );
        break;

      case BankruptcyStatus.DISMISSED:
        filing.dismissalDate = statusDate;
        this.logger.log(
          `Bankruptcy ${filing.caseNumber} DISMISSED - Automatic stay lifted. Collection MAY RESUME.`,
        );
        break;

      case BankruptcyStatus.CONVERTED:
        this.logger.log(
          `Bankruptcy ${filing.caseNumber} CONVERTED to different chapter - Automatic stay REMAINS in effect. Collection MUST continue to cease.`,
        );
        break;

      case BankruptcyStatus.PENDING:
        this.logger.log(
          `Bankruptcy ${filing.caseNumber} status updated to PENDING - Automatic stay ACTIVE. Collection MUST cease.`,
        );
        break;
    }

    // Set case closed date if discharged or dismissed
    if (
      newStatus === BankruptcyStatus.DISCHARGED ||
      newStatus === BankruptcyStatus.DISMISSED
    ) {
      filing.caseClosedDate = statusDate;
    }

    const updated = await this.bankruptcyFilingRepository.save(filing);

    // Publish BANKRUPTCY_STATUS_UPDATED event
    // - If DISCHARGED: Update debt status to DISCHARGED, permanently stop collection
    // - If DISMISSED: Update debt status to resume collection
    // - If CONVERTED: Track new chapter, maintain stay
    await this.publishBankruptcyStatusUpdatedEvent(updated, oldStatus);

    return updated;
  }

  /**
   * Record proof of claim filing
   *
   * Tracks when creditor files proof of claim with bankruptcy court
   *
   * @param filingId - BankruptcyFiling ID
   * @param claimAmount - Amount claimed
   * @param filedDate - Date proof of claim filed
   * @returns Updated BankruptcyFiling
   */
  async recordProofOfClaim(
    filingId: string,
    claimAmount: number,
    filedDate: Date = new Date(),
  ): Promise<BankruptcyFiling> {
    const filing = await this.bankruptcyFilingRepository.findOne({
      where: { id: filingId },
    });

    if (!filing) {
      throw new NotFoundException(
        `BankruptcyFiling with ID ${filingId} not found`,
      );
    }

    filing.proofOfClaimFiled = true;
    filing.proofOfClaimFiledDate = filedDate;
    filing.claimedAmount = claimAmount.toString();

    const updated = await this.bankruptcyFilingRepository.save(filing);

    this.logger.log(
      `Proof of claim filed for bankruptcy ${filing.caseNumber}: $${claimAmount.toFixed(2)} claimed on ${filedDate.toISOString().split('T')[0]}`,
    );

    return updated;
  }

  /**
   * Check if automatic stay is active for a debtor
   *
   * CRITICAL COMPLIANCE CHECK:
   * Returns true if ANY active bankruptcy filing exists for debtor.
   * If true, collection MUST NOT occur.
   *
   * @param debtorProfileId - Debtor profile ID
   * @returns True if automatic stay active, false otherwise
   */
  async checkAutomaticStay(debtorProfileId: string): Promise<boolean> {
    const activeFilings = await this.bankruptcyFilingRepository.find({
      where: [
        { debtorProfileId, status: BankruptcyStatus.FILED },
        { debtorProfileId, status: BankruptcyStatus.PENDING },
        { debtorProfileId, status: BankruptcyStatus.CONVERTED },
      ],
    });

    const hasActiveStay = activeFilings.length > 0;

    if (hasActiveStay) {
      this.logger.warn(
        `⚠️  AUTOMATIC STAY ACTIVE for debtor ${debtorProfileId}: ${activeFilings.length} active bankruptcy case(s). Collection PROHIBITED.`,
      );
    }

    return hasActiveStay;
  }

  /**
   * Check if debt is discharged in bankruptcy
   *
   * Returns true if debt was discharged (legally eliminated).
   * If true, collection is PERMANENTLY prohibited.
   *
   * @param debtId - Debt ID
   * @returns True if debt discharged, false otherwise
   */
  async isDebtDischarged(debtId: string): Promise<boolean> {
    const dischargedFilings = await this.bankruptcyFilingRepository.find({
      where: {
        debtId,
        status: BankruptcyStatus.DISCHARGED,
        debtDischarged: true,
      },
    });

    return dischargedFilings.length > 0;
  }

  /**
   * Get all bankruptcy filings for a debtor
   *
   * Returns complete bankruptcy history ordered by date (newest first)
   */
  async getFilingHistory(debtorProfileId: string): Promise<BankruptcyFiling[]> {
    return this.bankruptcyFilingRepository.find({
      where: { debtorProfileId },
      order: { filingDate: 'DESC' },
    });
  }

  /**
   * Get active bankruptcy filing for a debtor
   *
   * Returns the most recent active filing, or null if none
   */
  async getActiveFiling(
    debtorProfileId: string,
  ): Promise<BankruptcyFiling | null> {
    return this.bankruptcyFilingRepository.findOne({
      where: [
        { debtorProfileId, status: BankruptcyStatus.FILED },
        { debtorProfileId, status: BankruptcyStatus.PENDING },
        { debtorProfileId, status: BankruptcyStatus.CONVERTED },
      ],
      order: { filingDate: 'DESC' },
    });
  }

  /**
   * Get bankruptcy filing by case number
   *
   * Useful for looking up cases from court documents
   */
  async getFilingByCaseNumber(
    organizationId: string,
    caseNumber: string,
  ): Promise<BankruptcyFiling | null> {
    return this.bankruptcyFilingRepository.findOne({
      where: { organizationId, caseNumber },
    });
  }

  /**
   * Get compliance report for bankruptcy cases
   *
   * Returns aggregate metrics for monitoring FDCPA compliance
   */
  async getComplianceReport(organizationId: string): Promise<{
    totalFilings: number;
    activeFilings: number;
    dischargedFilings: number;
    dismissedFilings: number;
    convertedFilings: number;
    proofOfClaimFiled: number;
    proofOfClaimPending: number;
    debtsUnderAutomaticStay: number;
    debtsDischarged: number;
    filingsByChapter: Record<BankruptcyChapter, number>;
  }> {
    const filings = await this.bankruptcyFilingRepository.find({
      where: { organizationId },
    });

    const totalFilings = filings.length;
    const activeFilings = filings.filter(
      (f: BankruptcyFiling) =>
        f.status === BankruptcyStatus.FILED ||
        f.status === BankruptcyStatus.PENDING ||
        f.status === BankruptcyStatus.CONVERTED,
    ).length;
    const dischargedFilings = filings.filter(
      (f: BankruptcyFiling) => f.status === BankruptcyStatus.DISCHARGED,
    ).length;
    const dismissedFilings = filings.filter(
      (f: BankruptcyFiling) => f.status === BankruptcyStatus.DISMISSED,
    ).length;
    const convertedFilings = filings.filter(
      (f: BankruptcyFiling) => f.status === BankruptcyStatus.CONVERTED,
    ).length;
    const proofOfClaimFiled = filings.filter((f: BankruptcyFiling) => f.proofOfClaimFiled).length;
    const proofOfClaimPending = activeFilings - proofOfClaimFiled;
    const debtsUnderAutomaticStay = filings.filter(
      (f: BankruptcyFiling) =>
        (f.status === BankruptcyStatus.FILED ||
          f.status === BankruptcyStatus.PENDING ||
          f.status === BankruptcyStatus.CONVERTED) &&
        f.debtId,
    ).length;
    const debtsDischarged = filings.filter(
      (f: BankruptcyFiling) => f.status === BankruptcyStatus.DISCHARGED && f.debtDischarged && f.debtId,
    ).length;

    // Group by chapter
    const filingsByChapter = filings.reduce(
      (acc: Record<BankruptcyChapter, number>, f: BankruptcyFiling) => {
        acc[f.chapter] = (acc[f.chapter] || 0) + 1;
        return acc;
      },
      {} as Record<BankruptcyChapter, number>,
    );

    return {
      totalFilings,
      activeFilings,
      dischargedFilings,
      dismissedFilings,
      convertedFilings,
      proofOfClaimFiled,
      proofOfClaimPending,
      debtsUnderAutomaticStay,
      debtsDischarged,
      filingsByChapter,
    };
  }

  /**
   * Find bankruptcy filing by ID
   */
  async findById(id: string): Promise<BankruptcyFiling> {
    const filing = await this.bankruptcyFilingRepository.findOne({
      where: { id },
    });

    if (!filing) {
      throw new NotFoundException(`BankruptcyFiling with ID ${id} not found`);
    }

    return filing;
  }

  /**
   * Publish BankruptcyFiled event
   */
  private async publishBankruptcyFiledEvent(
    filing: BankruptcyFiling,
  ): Promise<void> {
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TRANSACTIONS_BANKRUPTCY_FILED,
        {
          bankruptcyFilingId: filing.id,
          debtorProfileId: filing.debtorProfileId,
          debtId: filing.debtId,
          organizationId: filing.organizationId,
          chapter: filing.chapter,
          caseNumber: filing.caseNumber,
          courtDistrict: filing.courtDistrict,
          filingDate: filing.filingDate.toISOString(),
          debtIncludedInSchedules: filing.debtIncludedInSchedules,
          filedAt: filing.createdAt.toISOString(),
        },
        BankruptcyFiledDto,
      );

      this.logger.debug(
        `Published TRANSACTIONS_BANKRUPTCY_FILED event for filing ${filing.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish BankruptcyFiled event for filing ${filing.id}`,
        error,
      );
    }
  }

  /**
   * Publish BankruptcyStatusUpdated event
   */
  private async publishBankruptcyStatusUpdatedEvent(
    filing: BankruptcyFiling,
    oldStatus: BankruptcyStatus,
  ): Promise<void> {
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TRANSACTIONS_BANKRUPTCY_STATUS_UPDATED,
        {
          bankruptcyFilingId: filing.id,
          debtorProfileId: filing.debtorProfileId,
          debtId: filing.debtId,
          organizationId: filing.organizationId,
          caseNumber: filing.caseNumber,
          oldStatus,
          newStatus: filing.status,
          statusDate: filing.dischargeDate?.toISOString() || filing.dismissalDate?.toISOString() || new Date().toISOString(),
          debtDischarged: filing.debtDischarged,
          updatedAt: filing.updatedAt.toISOString(),
        },
        BankruptcyStatusUpdatedDto,
      );

      this.logger.debug(
        `Published TRANSACTIONS_BANKRUPTCY_STATUS_UPDATED event for filing ${filing.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish BankruptcyStatusUpdated event for filing ${filing.id}`,
        error,
      );
    }
  }
}
