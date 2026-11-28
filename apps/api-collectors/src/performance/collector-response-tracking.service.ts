import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CollectorResponseTracking } from './entities';
import { AssignmentReason, ResponseType, ResolutionType } from '@verichron/enums';

/**
 * Collector Response Tracking Service
 *
 * Manages the CollectorResponseTracking entity (CQRS Read Model)
 * for analytics and collector performance metrics.
 */
@Injectable()
export class CollectorResponseTrackingService {
  private readonly logger = new Logger(CollectorResponseTrackingService.name);

  constructor(
    @InjectRepository(CollectorResponseTracking)
    private readonly responseTrackingRepository: Repository<CollectorResponseTracking>,
  ) {}

  /**
   * Create a new response tracking record when work queue item is assigned
   */
  async createTrackingRecord(params: {
    organizationId: string;
    collectorUserId: string;
    debtorId: string;
    workQueueItemId: string;
    assignedAt: Date;
    assignmentReason: AssignmentReason;
    reassignedFromCollectorId?: string;
    metadata?: Record<string, any>;
  }): Promise<CollectorResponseTracking> {
    const tracking = this.responseTrackingRepository.create({
      organizationId: params.organizationId,
      collectorUserId: params.collectorUserId,
      debtorId: params.debtorId,
      workQueueItemId: params.workQueueItemId,
      assignedAt: params.assignedAt,
      assignmentReason: params.assignmentReason,
      reassignedFromCollectorId: params.reassignedFromCollectorId,
      totalContactAttempts: 0,
      isSuccessfulResolution: false,
      metadata: params.metadata,
    });

    const saved = await this.responseTrackingRepository.save(tracking);

    this.logger.log(
      `Created response tracking record ${saved.id} for debtor ${params.debtorId} assigned to collector ${params.collectorUserId}`,
    );

    return saved;
  }

  /**
   * Update tracking record when first contact attempt is made
   */
  async recordFirstContactAttempt(
    workQueueItemId: string,
    contactedAt: Date,
  ): Promise<void> {
    // Find the most recent tracking record for this work queue item
    const tracking = await this.responseTrackingRepository.findOne({
      where: { workQueueItemId },
      order: { assignedAt: 'DESC' },
    });

    if (!tracking) {
      this.logger.warn(
        `No tracking record found for work queue item ${workQueueItemId}`,
      );
      return;
    }

    // Only update if this is the first contact attempt
    if (!tracking.firstContactAttemptAt) {
      tracking.firstContactAttemptAt = contactedAt;
      tracking.totalContactAttempts = 1;

      await this.responseTrackingRepository.save(tracking);

      this.logger.log(
        `Recorded first contact attempt for tracking ${tracking.id}`,
      );
    } else {
      // Increment contact attempts
      tracking.totalContactAttempts += 1;
      await this.responseTrackingRepository.save(tracking);

      this.logger.debug(
        `Incremented contact attempts to ${tracking.totalContactAttempts} for tracking ${tracking.id}`,
      );
    }
  }

  /**
   * Update tracking record when debtor responds
   */
  async recordFirstResponse(
    workQueueItemId: string,
    respondedAt: Date,
    responseType: ResponseType,
  ): Promise<void> {
    const tracking = await this.responseTrackingRepository.findOne({
      where: { workQueueItemId },
      order: { assignedAt: 'DESC' },
    });

    if (!tracking) {
      this.logger.warn(
        `No tracking record found for work queue item ${workQueueItemId}`,
      );
      return;
    }

    // Only update if this is the first response
    if (!tracking.firstResponseAt) {
      tracking.firstResponseAt = respondedAt;
      tracking.responseType = responseType;

      // Calculate time to first response from assignment
      const assignedTime = tracking.assignedAt.getTime();
      const responseTime = respondedAt.getTime();
      tracking.timeToFirstResponseMinutes = Math.floor(
        (responseTime - assignedTime) / (1000 * 60),
      );

      // Calculate time to response from first contact (if contact was made)
      if (tracking.firstContactAttemptAt) {
        const contactTime = tracking.firstContactAttemptAt.getTime();
        tracking.timeToResponseFromContactMinutes = Math.floor(
          (responseTime - contactTime) / (1000 * 60),
        );
      }

      await this.responseTrackingRepository.save(tracking);

      this.logger.log(
        `Recorded first response for tracking ${tracking.id}: ${responseType} after ${tracking.timeToFirstResponseMinutes} minutes`,
      );
    }
  }

  /**
   * Update tracking record when work queue item is resolved
   */
  async recordResolution(
    workQueueItemId: string,
    resolvedAt: Date,
    resolutionType: ResolutionType,
  ): Promise<void> {
    const tracking = await this.responseTrackingRepository.findOne({
      where: { workQueueItemId },
      order: { assignedAt: 'DESC' },
    });

    if (!tracking) {
      this.logger.warn(
        `No tracking record found for work queue item ${workQueueItemId}`,
      );
      return;
    }

    tracking.resolvedAt = resolvedAt;
    tracking.resolutionType = resolutionType;

    // Calculate days to resolution
    const assignedTime = tracking.assignedAt.getTime();
    const resolvedTime = resolvedAt.getTime();
    tracking.daysToResolution = Math.floor(
      (resolvedTime - assignedTime) / (1000 * 60 * 60 * 24),
    );

    // Determine if this is a successful resolution (payment-related)
    tracking.isSuccessfulResolution = [
      ResolutionType.PAID_IN_FULL,
      ResolutionType.PAYMENT_PLAN,
      ResolutionType.SETTLED,
    ].includes(resolutionType);

    await this.responseTrackingRepository.save(tracking);

    this.logger.log(
      `Recorded resolution for tracking ${tracking.id}: ${resolutionType} after ${tracking.daysToResolution} days`,
    );
  }

  /**
   * Calculate average time to first contact for a collector
   */
  async getAverageTimeToContact(
    organizationId: string,
    collectorUserId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const result = await this.responseTrackingRepository
      .createQueryBuilder('tracking')
      .select('AVG(tracking.time_to_first_response_minutes)', 'avgMinutes')
      .where('tracking.organization_id = :organizationId', { organizationId })
      .andWhere('tracking.collector_user_id = :collectorUserId', {
        collectorUserId,
      })
      .andWhere('tracking.assigned_at >= :periodStart', { periodStart })
      .andWhere('tracking.assigned_at <= :periodEnd', { periodEnd })
      .andWhere('tracking.first_response_at IS NOT NULL')
      .getRawOne();

    return result?.avgMinutes ? Math.round(parseFloat(result.avgMinutes)) : 0;
  }

  /**
   * Count resolved accounts for a collector
   */
  async getResolvedAccountsCount(
    organizationId: string,
    collectorUserId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    return await this.responseTrackingRepository.count({
      where: {
        organizationId,
        collectorUserId,
        assignedAt: Between(periodStart, periodEnd),
        resolvedAt: Not(IsNull()),
      },
    });
  }

  /**
   * Calculate recovery rate for a collector
   *
   * Recovery rate = (accounts successfully resolved / total accounts contacted) * 100
   */
  async getRecoveryRate(
    organizationId: string,
    collectorUserId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const result = await this.responseTrackingRepository
      .createQueryBuilder('tracking')
      .select('COUNT(*)', 'totalContacted')
      .addSelect(
        'SUM(CASE WHEN tracking.is_successful_resolution = true THEN 1 ELSE 0 END)',
        'successfulResolutions',
      )
      .where('tracking.organization_id = :organizationId', { organizationId })
      .andWhere('tracking.collector_user_id = :collectorUserId', {
        collectorUserId,
      })
      .andWhere('tracking.assigned_at >= :periodStart', { periodStart })
      .andWhere('tracking.assigned_at <= :periodEnd', { periodEnd })
      .andWhere('tracking.first_contact_attempt_at IS NOT NULL')
      .getRawOne();

    const totalContacted = parseInt(result?.totalContacted || '0');
    const successfulResolutions = parseInt(
      result?.successfulResolutions || '0',
    );

    if (totalContacted === 0) {
      return 0;
    }

    return Math.round((successfulResolutions / totalContacted) * 100);
  }
}

// Add missing imports
import { Between, IsNull, Not } from 'typeorm';
