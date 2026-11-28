import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChargeOffHistory } from './entities/charge-off-history.entity';
import { Debt } from '../debts/entities/debt.entity';
import { ChargeOffReason } from '@verichron/enums';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { ChargeOffRecordedDto, ChargeOffReversedDto } from '../events/event-dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * Charge-Offs Service
 *
 * Manages charge-off history tracking and recovery.
 * Provides operations for recording charge-offs, reversals, and recovery tracking.
 *
 * KEY OPERATIONS:
 * - recordChargeOff: Create new charge-off event, update debt entity
 * - reverseChargeOff: Mark charge-off as reversed (debt recovered)
 * - recordRecovery: Track recovery amount after charge-off
 * - getChargeOffHistory: Retrieve all charge-offs for a debt
 * - getLatestChargeOff: Get most recent charge-off for a debt
 */
@Injectable()
export class ChargeOffsService {
  private readonly logger = new Logger(ChargeOffsService.name);

  constructor(
    @InjectRepository(ChargeOffHistory)
    private readonly chargeOffRepository: Repository<ChargeOffHistory>,
    @InjectRepository(Debt)
    private readonly debtRepository: Repository<Debt>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Record a charge-off event
   *
   * Creates new ChargeOffHistory record and updates Debt entity's chargeOffDate
   * (denormalized for performance).
   *
   * @param debtId - Debt being charged off
   * @param chargeOffDate - Date of charge-off
   * @param reason - Reason for charge-off
   * @param balances - Current balances at time of charge-off
   * @param daysDelinquent - Days past due
   * @param userId - User recording the charge-off (optional)
   * @returns Created ChargeOffHistory record
   */
  async recordChargeOff(params: {
    debtId: string;
    organizationId: string;
    chargeOffDate: Date;
    reason: ChargeOffReason;
    principalBalance: number;
    interestBalance?: number;
    feesBalance?: number;
    daysDelinquent: number;
    reportedToCreditBureaus?: boolean;
    creditBureauReportDate?: Date;
    notes?: string;
    createdBy?: string;
  }): Promise<ChargeOffHistory> {
    const {
      debtId,
      organizationId,
      chargeOffDate,
      reason,
      principalBalance,
      interestBalance = 0,
      feesBalance = 0,
      daysDelinquent,
      reportedToCreditBureaus = false,
      creditBureauReportDate = null,
      notes = null,
      createdBy = null,
    } = params;

    // Verify debt exists
    const debt = await this.debtRepository.findOne({
      where: { id: debtId, organizationId },
    });

    if (!debt) {
      throw new NotFoundException(`Debt with ID ${debtId} not found`);
    }

    // Calculate total charged off
    const totalChargedOff = principalBalance + interestBalance + feesBalance;

    // Create charge-off history record
    const chargeOff = this.chargeOffRepository.create({
      organizationId,
      debtId,
      chargeOffDate,
      reason,
      principalBalance: principalBalance.toString(),
      interestBalance: interestBalance.toString(),
      feesBalance: feesBalance.toString(),
      totalChargedOff: totalChargedOff.toString(),
      daysDelinquent,
      isReversed: false,
      reportedToCreditBureaus,
      creditBureauReportDate,
      notes,
      createdBy,
    });

    const saved = await this.chargeOffRepository.save(chargeOff);

    // Update debt entity with most recent charge-off date (denormalized)
    await this.debtRepository.update(debtId, {
      chargeOffDate,
    });

    this.logger.log(
      `Recorded charge-off for debt ${debtId}: ${reason} - $${totalChargedOff.toFixed(2)} (${daysDelinquent} days delinquent)`,
    );

    // Publish DEBT_CHARGED_OFF event for downstream systems
    await this.publishChargeOffRecordedEvent(saved);

    return saved;
  }

  /**
   * Reverse a charge-off (debt recovered or paid)
   *
   * @param chargeOffId - ChargeOffHistory ID to reverse
   * @param reversalDate - Date of reversal
   * @param reversalReason - Reason for reversal
   * @returns Updated ChargeOffHistory record
   */
  async reverseChargeOff(
    chargeOffId: string,
    reversalDate: Date,
    reversalReason: string,
  ): Promise<ChargeOffHistory> {
    const chargeOff = await this.chargeOffRepository.findOne({
      where: { id: chargeOffId },
    });

    if (!chargeOff) {
      throw new NotFoundException(
        `ChargeOffHistory with ID ${chargeOffId} not found`,
      );
    }

    if (chargeOff.isReversed) {
      throw new Error(
        `ChargeOffHistory ${chargeOffId} is already reversed`,
      );
    }

    chargeOff.isReversed = true;
    chargeOff.reversalDate = reversalDate;
    chargeOff.reversalReason = reversalReason;

    const updated = await this.chargeOffRepository.save(chargeOff);

    this.logger.log(
      `Reversed charge-off ${chargeOffId} for debt ${chargeOff.debtId}: ${reversalReason}`,
    );

    // Publish ChargeOffReversed event
    await this.publishChargeOffReversedEvent(updated);

    // TODO: Check if this was the most recent charge-off
    // If so, update debt.chargeOffDate to next most recent or null

    return updated;
  }

  /**
   * Record recovery amount after charge-off
   *
   * Tracks partial or full recovery of charged-off debt.
   * Does NOT automatically reverse the charge-off.
   *
   * @param chargeOffId - ChargeOffHistory ID
   * @param recoveredAmount - Amount recovered
   * @param recoveredDate - Date of recovery
   * @returns Updated ChargeOffHistory record
   */
  async recordRecovery(
    chargeOffId: string,
    recoveredAmount: number,
    recoveredDate: Date,
  ): Promise<ChargeOffHistory> {
    const chargeOff = await this.chargeOffRepository.findOne({
      where: { id: chargeOffId },
    });

    if (!chargeOff) {
      throw new NotFoundException(
        `ChargeOffHistory with ID ${chargeOffId} not found`,
      );
    }

    chargeOff.recoveredAmount = recoveredAmount.toString();
    chargeOff.recoveredDate = recoveredDate;

    const updated = await this.chargeOffRepository.save(chargeOff);

    this.logger.log(
      `Recorded recovery for charge-off ${chargeOffId}: $${recoveredAmount.toFixed(2)} recovered on ${recoveredDate.toISOString().split('T')[0]}`,
    );

    return updated;
  }

  /**
   * Get all charge-off history for a debt
   *
   * Returns all charge-offs ordered by date (newest first)
   */
  async getChargeOffHistory(debtId: string): Promise<ChargeOffHistory[]> {
    return this.chargeOffRepository.find({
      where: { debtId },
      order: { chargeOffDate: 'DESC' },
    });
  }

  /**
   * Get latest (most recent) charge-off for a debt
   *
   * Returns null if debt has never been charged off
   */
  async getLatestChargeOff(
    debtId: string,
  ): Promise<ChargeOffHistory | null> {
    return this.chargeOffRepository.findOne({
      where: { debtId },
      order: { chargeOffDate: 'DESC' },
    });
  }

  /**
   * Get all charge-offs for an organization within date range
   *
   * Used for reporting and analytics
   */
  async getChargeOffsByDateRange(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ChargeOffHistory[]> {
    return this.chargeOffRepository
      .createQueryBuilder('chargeOff')
      .where('chargeOff.organization_id = :organizationId', { organizationId })
      .andWhere('chargeOff.charge_off_date >= :startDate', { startDate })
      .andWhere('chargeOff.charge_off_date <= :endDate', { endDate })
      .orderBy('chargeOff.charge_off_date', 'DESC')
      .getMany();
  }

  /**
   * Get charge-off statistics for an organization
   *
   * Returns aggregate metrics for reporting
   */
  async getChargeOffStats(organizationId: string): Promise<{
    totalChargeOffs: number;
    totalAmount: number;
    totalRecovered: number;
    recoveryRate: number;
    chargeOffsByReason: Record<ChargeOffReason, number>;
  }> {
    const chargeOffs = await this.chargeOffRepository.find({
      where: { organizationId },
    });

    const totalChargeOffs = chargeOffs.length;
    const totalAmount = chargeOffs.reduce(
      (sum, co) => sum + parseFloat(co.totalChargedOff),
      0,
    );
    const totalRecovered = chargeOffs.reduce(
      (sum, co) => sum + (co.recoveredAmount ? parseFloat(co.recoveredAmount) : 0),
      0,
    );
    const recoveryRate = totalAmount > 0 ? (totalRecovered / totalAmount) * 100 : 0;

    // Group by reason
    const chargeOffsByReason = chargeOffs.reduce(
      (acc, co) => {
        acc[co.reason] = (acc[co.reason] || 0) + 1;
        return acc;
      },
      {} as Record<ChargeOffReason, number>,
    );

    return {
      totalChargeOffs,
      totalAmount,
      totalRecovered,
      recoveryRate,
      chargeOffsByReason,
    };
  }

  /**
   * Publish ChargeOffRecorded event
   */
  private async publishChargeOffRecordedEvent(
    chargeOff: ChargeOffHistory,
  ): Promise<void> {
    try {
      const dto = plainToInstance(ChargeOffRecordedDto, {
        chargeOffId: chargeOff.id,
        debtId: chargeOff.debtId,
        organizationId: chargeOff.organizationId,
        chargeOffDate: chargeOff.chargeOffDate.toISOString(),
        reason: chargeOff.reason,
        totalChargedOff: parseFloat(chargeOff.totalChargedOff),
        principalChargedOff: parseFloat(chargeOff.principalBalance),
        interestChargedOff: parseFloat(chargeOff.interestBalance),
        feesChargedOff: parseFloat(chargeOff.feesBalance),
        createdAt: chargeOff.createdAt.toISOString(),
      });

      const errors = await validate(dto);
      if (errors.length > 0) {
        this.logger.error(
          `Failed to validate ChargeOffRecordedDto: ${JSON.stringify(errors)}`,
        );
        return;
      }

      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTS_CHARGE_OFF_RECORDED,
        dto,
        ChargeOffRecordedDto,
      );

      this.logger.debug(
        `Published DEBTS_CHARGE_OFF_RECORDED event for charge-off ${chargeOff.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish ChargeOffRecorded event for charge-off ${chargeOff.id}`,
        error,
      );
      // Don't throw - event publishing failures shouldn't block business logic
    }
  }

  /**
   * Publish ChargeOffReversed event
   */
  private async publishChargeOffReversedEvent(
    chargeOff: ChargeOffHistory,
  ): Promise<void> {
    try {
      const dto = plainToInstance(ChargeOffReversedDto, {
        chargeOffId: chargeOff.id,
        debtId: chargeOff.debtId,
        organizationId: chargeOff.organizationId,
        reversalDate: chargeOff.reversalDate?.toISOString() || new Date().toISOString(),
        reversalReason: chargeOff.reversalReason || '',
        recoveredAmount: chargeOff.recoveredAmount ? parseFloat(chargeOff.recoveredAmount) : null,
        reversedAt: new Date().toISOString(),
      });

      const errors = await validate(dto);
      if (errors.length > 0) {
        this.logger.error(
          `Failed to validate ChargeOffReversedDto: ${JSON.stringify(errors)}`,
        );
        return;
      }

      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTS_CHARGE_OFF_REVERSED,
        dto,
        ChargeOffReversedDto,
      );

      this.logger.debug(
        `Published DEBTS_CHARGE_OFF_REVERSED event for charge-off ${chargeOff.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish ChargeOffReversed event for charge-off ${chargeOff.id}`,
        error,
      );
      // Don't throw - event publishing failures shouldn't block business logic
    }
  }
}
