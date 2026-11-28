import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommunicationLog } from '../../logs/schemas/communication-log.schema';
import {
  DebtorFocusCommunicationsResponseDto,
  DebtorFocusCommunicationDto,
  CollectorCommunicationStatsDto,
  OrganizationCommunicationStatsDto,
  CollectorDashboardMetricsDto,
} from './dto';
import { CommunicationType, CommunicationStatus } from '@verichron/enums';

/**
 * Internal Analytics Service for api-communications
 *
 * Provides communication history for the event orchestrator.
 * This service is only called via internal endpoints, not exposed to external users.
 *
 * NOTE: Full implementation requires MongoDB/Mongoose installation.
 */
@Injectable()
export class InternalAnalyticsService {
  private readonly logger = new Logger(InternalAnalyticsService.name);

  constructor(
    @InjectModel(CommunicationLog.name)
    private readonly communicationLogModel: Model<CommunicationLog>,
  ) {}

  /**
   * Get aggregated communication metrics for the dashboard summary
   */
  async getDashboardSummary(
    organizationId: string,
    date?: string,
  ): Promise<{ todayContacts: number }> {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    this.logger.log(
      `Fetching dashboard summary for org: ${organizationId} from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`,
    );

    const count = await this.communicationLogModel.countDocuments({
      organizationId,
      sentAt: { $gte: startOfDay, $lte: endOfDay },
    });

    return { todayContacts: count };
  }

  /**
   * Get recent communication logs for an organization (for activity feed)
   */
  async getRecentLogs(
    organizationId: string,
    limit: number = 20,
  ): Promise<any[]> {
    this.logger.log(
      `Fetching ${limit} recent logs for org: ${organizationId}`,
    );

    const logs = await this.communicationLogModel
      .find({ organizationId })
      .sort({ sentAt: -1 })
      .limit(limit)
      .exec();

    return logs.map((log) => ({
      id: log._id.toString(),
      type: log.type,
      status: log.status,
      subject: log.content?.subject || null,
      debtorId: log.debtorId,
      collectorUserId: log.collectorUserId,
      sentAt: log.sentAt,
      metadata: log.metadata,
    }));
  }

  /**
   * Get communication history for a specific debtor
   *
   * TODO: Implement MongoDB query when Mongoose is installed
   */
  async getDebtorCommunications(
    organizationId: string,
    debtorProfileId: string,
  ): Promise<DebtorFocusCommunicationsResponseDto> {
    this.logger.log(
      `Fetching communications for debtor: ${debtorProfileId} in organization: ${organizationId}`,
    );

    // Query MongoDB for all communications for this debtor
    const communications = await this.communicationLogModel
      .find({
        organizationId,
        debtorId: debtorProfileId,
      })
      .sort({ sentAt: -1 })
      .exec();

    // Map communications to DTOs
    const communicationDtos: DebtorFocusCommunicationDto[] = communications.map(
      (comm) => ({
        communicationId: comm._id.toString(),
        type: comm.type as CommunicationType,
        status: comm.status as CommunicationStatus,
        debtId: comm.debtId || null,
        templateName: comm.templateName || null,
        subject: comm.content?.subject || null,
        provider: comm.provider || null,
        sentAt: comm.sentAt ? comm.sentAt.toISOString() : null,
        deliveredAt: comm.deliveredAt ? comm.deliveredAt.toISOString() : null,
        openedAt: comm.openedAt ? comm.openedAt.toISOString() : null,
        failureReason: comm.failureReason || null,
        blockedReason: comm.blockedReason || null,
        createdAt: comm.createdAt.toISOString(),
      }),
    );

    // Calculate aggregates
    const emailCount = communications.filter(
      (c) => c.type === CommunicationType.EMAIL,
    ).length;
    const smsCount = communications.filter(
      (c) => c.type === CommunicationType.SMS,
    ).length;
    const letterCount = communications.filter(
      (c) => c.type === CommunicationType.LETTER,
    ).length;
    const deliveredCount = communications.filter(
      (c) => c.status === CommunicationStatus.DELIVERED,
    ).length;
    const failedCount = communications.filter(
      (c) => c.status === CommunicationStatus.FAILED,
    ).length;
    const openedCount = communications.filter(
      (c) => c.status === CommunicationStatus.OPENED || c.openedAt != null,
    ).length;

    const lastCommunication = communications[0]; // Already sorted DESC

    return {
      communications: communicationDtos,
      totalCommunications: communications.length,
      emailCount,
      smsCount,
      letterCount,
      deliveredCount,
      failedCount,
      openedCount,
      lastCommunicationDate: lastCommunication?.sentAt
        ? lastCommunication.sentAt.toISOString().split('T')[0]
        : null,
      lastCommunicationType: lastCommunication?.type || null,
    };
  }

  /**
   * Get communication statistics for a specific collector within a time period
   *
   * TODO: Implement MongoDB aggregation when Mongoose is installed
   *
   * Query requirements:
   * 1. Filter by organizationId, collectorUserId, and date range (sentAt between periodStart and periodEnd)
   * 2. Aggregate counts by communication type (CALL, EMAIL, SMS)
   * 3. Count unique debtorIds contacted
   * 4. Calculate email response rate (opened / delivered * 100)
   */
  async getCollectorCommunicationStats(
    organizationId: string,
    collectorUserId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<CollectorCommunicationStatsDto> {
    this.logger.log(
      `Fetching communication stats for collector: ${collectorUserId} in organization: ${organizationId} from ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
    );

    // MongoDB aggregation to calculate stats
    const stats = await this.communicationLogModel.aggregate([
      {
        $match: {
          organizationId,
          collectorUserId,
          sentAt: { $gte: periodStart, $lte: periodEnd },
        },
      },
      {
        $group: {
          _id: null,
          totalCalls: {
            $sum: { $cond: [{ $eq: ['$type', 'CALL'] }, 1, 0] },
          },
          totalEmails: {
            $sum: { $cond: [{ $eq: ['$type', 'EMAIL'] }, 1, 0] },
          },
          totalSms: {
            $sum: { $cond: [{ $eq: ['$type', 'SMS'] }, 1, 0] },
          },
          uniqueDebtorIds: { $addToSet: '$debtorId' },
          emailsDelivered: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'EMAIL'] },
                    { $eq: ['$status', 'DELIVERED'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          emailsOpened: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'EMAIL'] },
                    { $ne: ['$openedAt', null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Extract results from aggregation
    const result = stats.length > 0 ? stats[0] : null;
    const totalCalls = result?.totalCalls || 0;
    const totalEmails = result?.totalEmails || 0;
    const totalSms = result?.totalSms || 0;
    const uniqueAccountsContacted = result?.uniqueDebtorIds?.length || 0;
    const emailsDelivered = result?.emailsDelivered || 0;
    const emailsOpened = result?.emailsOpened || 0;
    const emailResponseRate =
      emailsDelivered > 0 ? (emailsOpened / emailsDelivered) * 100 : 0;

    return {
      collectorUserId,
      totalCalls,
      totalEmails,
      totalSms,
      uniqueAccountsContacted,
      emailResponseRate: Number(emailResponseRate.toFixed(2)),
      emailsDelivered,
      emailsOpened,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }

  /**
   * Get communication statistics for all collectors in an organization within a time period
   *
   * TODO: Implement MongoDB aggregation when Mongoose is installed
   *
   * Query requirements:
   * 1. Filter by organizationId and date range (sentAt between periodStart and periodEnd)
   * 2. Group by collectorUserId
   * 3. Aggregate counts by communication type (CALL, EMAIL, SMS) per collector
   * 4. Count unique debtorIds contacted per collector
   * 5. Calculate email response rate per collector
   */
  async getOrganizationCommunicationStats(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OrganizationCommunicationStatsDto> {
    this.logger.log(
      `Fetching communication stats for all collectors in organization: ${organizationId} from ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
    );

    // MongoDB aggregation to calculate stats per collector
    const stats = await this.communicationLogModel.aggregate([
      {
        $match: {
          organizationId,
          sentAt: { $gte: periodStart, $lte: periodEnd },
          collectorUserId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$collectorUserId',
          totalCalls: {
            $sum: { $cond: [{ $eq: ['$type', 'CALL'] }, 1, 0] },
          },
          totalEmails: {
            $sum: { $cond: [{ $eq: ['$type', 'EMAIL'] }, 1, 0] },
          },
          totalSms: {
            $sum: { $cond: [{ $eq: ['$type', 'SMS'] }, 1, 0] },
          },
          uniqueDebtorIds: { $addToSet: '$debtorId' },
          emailsDelivered: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'EMAIL'] },
                    { $eq: ['$status', 'DELIVERED'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          emailsOpened: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$type', 'EMAIL'] },
                    { $ne: ['$openedAt', null] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    // Map results to DTOs
    const collectorStats: CollectorCommunicationStatsDto[] = stats.map((stat) => {
      const emailResponseRate =
        stat.emailsDelivered > 0
          ? (stat.emailsOpened / stat.emailsDelivered) * 100
          : 0;

      return {
        collectorUserId: stat._id,
        totalCalls: stat.totalCalls,
        totalEmails: stat.totalEmails,
        totalSms: stat.totalSms,
        uniqueAccountsContacted: stat.uniqueDebtorIds.length,
        emailResponseRate: Number(emailResponseRate.toFixed(2)),
        emailsDelivered: stat.emailsDelivered,
        emailsOpened: stat.emailsOpened,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      };
    });

    return {
      organizationId,
      collectorStats,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }

  /**
   * Get dashboard metrics for a collector (period + today in single response)
   *
   * Optimized endpoint that returns both the requested period stats and today's stats
   * in a single call to reduce HTTP overhead for dashboard rendering.
   */
  async getCollectorDashboardMetrics(
    organizationId: string,
    collectorUserId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<CollectorDashboardMetricsDto> {
    this.logger.log(
      `Fetching dashboard metrics for collector: ${collectorUserId} in organization: ${organizationId}`,
    );

    // Calculate today's date range
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Fetch both period stats and today's stats in parallel
    const [periodStats, todayStats] = await Promise.all([
      this.getCollectorCommunicationStats(
        organizationId,
        collectorUserId,
        periodStart,
        periodEnd,
      ),
      this.getCollectorCommunicationStats(
        organizationId,
        collectorUserId,
        startOfToday,
        endOfToday,
      ),
    ]);

    return {
      collectorUserId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      // Period metrics
      totalCalls: periodStats.totalCalls,
      totalEmails: periodStats.totalEmails,
      totalSms: periodStats.totalSms,
      uniqueAccountsContacted: periodStats.uniqueAccountsContacted,
      emailResponseRate: periodStats.emailResponseRate,
      emailsDelivered: periodStats.emailsDelivered,
      emailsOpened: periodStats.emailsOpened,
      // Today's metrics
      totalCallsToday: todayStats.totalCalls,
      totalEmailsToday: todayStats.totalEmails,
      totalSmsToday: todayStats.totalSms,
      uniqueAccountsContactedToday: todayStats.uniqueAccountsContacted,
      emailResponseRateToday: todayStats.emailResponseRate,
    };
  }

  /**
   * Get engagement metrics for a specific invitation batch (Wave).
   */
  async getInvitationWaveMetrics(organizationId: string, invitationBatchId: string) {
    this.logger.log(`Fetching metrics for invitation wave: ${invitationBatchId}`);

    const stats = await this.communicationLogModel.aggregate([
      {
        $match: {
          organizationId,
          'metadata.invitationBatchId': invitationBatchId,
        },
      },
      {
        $group: {
          _id: null,
          totalSent: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $eq: ['$status', 'DELIVERED'] }, 1, 0] } },
          bounced: { $sum: { $cond: [{ $eq: ['$status', 'FAILED'] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $ne: ['$openedAt', null] }, 1, 0] } },
          clicked: { $sum: { $cond: [{ $ne: ['$clickedAt', null] }, 1, 0] } },
        },
      },
    ]);

    const result = stats[0] || { 
      totalSent: 0, 
      delivered: 0, 
      bounced: 0, 
      opened: 0, 
      clicked: 0 
    };

    return {
      invitationBatchId,
      ...result,
      timestamp: new Date().toISOString(),
    };
  }
}
