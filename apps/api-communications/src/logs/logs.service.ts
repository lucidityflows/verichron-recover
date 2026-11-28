import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommunicationLog } from './schemas/communication-log.schema';
import { CommunicationType, CommunicationStatus, CommunicationProvider } from '@verichron/enums';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import {
  CommunicationDeliveredDto,
  CommunicationFailedDto,
  EmailOpenedDto, // Changed from CommunicationOpenedDto
  CommunicationClickedDto,
  CommunicationSpamReportedDto,
} from '../events/event-dto';

export interface CreateLogData {
  organizationId: string;
  debtorId: string;
  debtId?: string;
  collectorUserId?: string;
  type: CommunicationType;
  status: CommunicationStatus;
  provider?: string;
  providerMessageId?: string;
  templateId?: string;
  templateName?: string;
  content?: {
    subject?: string;
    body: string;
  };
  sentAt?: Date;
  blockedReason?: string;
  failureReason?: string;
  metadata?: Record<string, any>;
}

/**
 * Logs Service
 *
 * Handles communication logging to MongoDB and publishes events on status changes.
 */
@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(
    @InjectModel(CommunicationLog.name)
    private readonly logModel: Model<CommunicationLog>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Create a new communication log entry
   */
  async create(logData: CreateLogData): Promise<CommunicationLog> {
    const log = new this.logModel({
      ...logData,
      statusHistory: [
        {
          status: logData.status,
          timestamp: new Date(),
          metadata: logData.metadata,
        },
      ],
    });
    return log.save();
  }

  /**
   * Update log status and publish corresponding event.
   */
  async updateStatus(
    id: string,
    status: CommunicationStatus,
    metadata?: any,
  ): Promise<CommunicationLog | null> {
    this.logger.log(`Updating log ${id} to status: ${status}`);

    const updateData: any = {
      status,
      $push: {
        statusHistory: {
          status,
          timestamp: new Date(),
          metadata,
        },
      },
    };

    if (status === CommunicationStatus.DELIVERED) updateData.deliveredAt = new Date();
    else if (status === CommunicationStatus.OPENED) updateData.openedAt = new Date();
    else if (status === CommunicationStatus.CLICKED) updateData.clickedAt = new Date();
    else if (status === CommunicationStatus.FAILED) updateData.failureReason = metadata?.reason || 'Failure reported by provider';

    const updatedLog = await this.logModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (updatedLog) {
      await this._publishStatusEvent(updatedLog, status, metadata);
    }

    return updatedLog;
  }

  /**
   * Update log status by provider message ID (for webhooks)
   */
  async updateStatusByProviderMessageId(
    providerMessageId: string,
    status: CommunicationStatus,
    metadata?: any,
  ): Promise<CommunicationLog | null> {
    this.logger.log(
      `Updating log with providerMessageId ${providerMessageId} to status: ${status}`,
    );

    const log = await this.logModel.findOne({ providerMessageId }).exec();

    if (!log) {
      this.logger.warn(`No log found with providerMessageId: ${providerMessageId}`);
      return null;
    }

    return this.updateStatus(log._id.toString(), status, metadata);
  }

  /**
   * Publishes an event based on the new status of a communication log.
   */
  private async _publishStatusEvent(
    log: CommunicationLog,
    status: CommunicationStatus,
    metadata?: any,
  ): Promise<void> {
    const { _id, organizationId, debtorId, provider } = log;
    const logId = _id.toString();

    try {
      switch (status) {
        case CommunicationStatus.DELIVERED:
          await this.eventPublisher.publish(
            EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_DELIVERED,
            { logId, organizationId, debtorId, provider: provider as CommunicationProvider, deliveredAt: new Date().toISOString() },
            CommunicationDeliveredDto,
          );
          break;

        case CommunicationStatus.OPENED:
          await this.eventPublisher.publish(
            EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_OPENED,
            { logId, organizationId, debtorId, openedAt: new Date().toISOString(), ipAddress: metadata?.ip },
            EmailOpenedDto,
          );
          break;

        case CommunicationStatus.CLICKED:
          await this.eventPublisher.publish(
            EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_CLICKED,
            { logId, organizationId, debtorId, clickedAt: new Date().toISOString(), url: metadata?.url },
            CommunicationClickedDto,
          );
          break;

        case CommunicationStatus.FAILED:
           const isSpam = metadata?.event === 'spam_report';
           if(isSpam) {
                await this.eventPublisher.publish(
                    EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_SPAM_REPORTED,
                    { logId, organizationId, debtorId, reportedAt: new Date().toISOString() },
                    CommunicationSpamReportedDto,
                );
           } else {
                await this.eventPublisher.publish(
                    EVENT_TYPES.COMMUNICATIONS_COMMUNICATION_FAILED,
                    {
                        logId,
                        organizationId,
                        debtorId,
                        provider: provider as CommunicationProvider,
                        failedAt: new Date().toISOString(),
                        reason: metadata?.reason || 'Unknown failure', // Re-added 'reason'
                        failureReason: metadata?.reason || 'Unknown failure',
                        errorCode: metadata?.status,
                        isRetryable: false, // Re-added 'isRetryable'
                        retryable: false,
                    },
                    CommunicationFailedDto,
                );
           }
          break;

        default:
          // No event for other statuses like SENT, BLOCKED, etc. as they are published elsewhere or are internal.
          return;
      }
      this.logger.log(`Published ${status} event for log ${logId}`);
    } catch (error) {
      this.logger.error(`Failed to publish ${status} event for log ${logId}`, error);
      // We don't re-throw here to avoid rolling back the log update itself.
    }
  }

  // Other service methods (findAll, findOne, etc.) remain unchanged...

  /**
   * Find log by its MongoDB ObjectId.
   * This method does NOT enforce organizationId for use in specific internal contexts
   * (e.g., webhook processing where the logId is directly provided and trusted).
   */
  async findById(id: string): Promise<CommunicationLog | null> {
    return this.logModel.findById(id).exec();
  }

  /**
   * Query communication logs with filters
   */
  async findAll(filters: {
    organizationId?: string;
    debtorId?: string;
    collectorUserId?: string;
    type?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<CommunicationLog[]> {
    const query: any = {};

    if (filters.organizationId) query.organizationId = filters.organizationId;
    if (filters.debtorId) query.debtorId = filters.debtorId;
    if (filters.collectorUserId) query.collectorUserId = filters.collectorUserId;
    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    if (filters.startDate || filters.endDate) {
      query.sentAt = {};
      if (filters.startDate) query.sentAt.$gte = filters.startDate;
      if (filters.endDate) query.sentAt.$lte = filters.endDate;
    }

    return this.logModel
      .find(query)
      .sort({ sentAt: -1 })
      .limit(filters.limit || 100)
      .exec();
  }

  /**
   * Find recent communications for an organization (internal use)
   */
  async findRecent(organizationId: string, pageSize: number): Promise<CommunicationLog[]> {
    return this.findAll({ organizationId, limit: pageSize });
  }

  /**
   * Find log by ID
   */
  async findOne(id: string, organizationId: string): Promise<CommunicationLog | null> {
    return this.logModel.findOne({ _id: id, organizationId }).exec();
  }

  /**
   * Find recent communications for a debtor
   */
  async findRecentByDebtor(
    debtorId: string,
    days = 30,
  ): Promise<CommunicationLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.logModel
      .find({
        debtorId,
        sentAt: { $gte: startDate },
      })
      .sort({ sentAt: -1 })
      .exec();
  }

  /**
   * Get communication counts for collector analytics
   */
  async getCollectorCounts(
    organizationId: string,
    collectorUserId: string,
    type: CommunicationType,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    return this.logModel
      .countDocuments({
        organizationId,
        collectorUserId,
        type,
        sentAt: { $gte: startDate, $lte: endDate },
      })
      .exec();
  }

  /**
   * Get unique accounts contacted by collector
   */
  async getUniqueAccountsContacted(
    organizationId: string,
    collectorUserId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const results = await this.logModel.aggregate([
      {
        $match: {
          organizationId,
          collectorUserId,
          sentAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$debtorId',
        },
      },
      {
        $count: 'uniqueAccounts',
      },
    ]);

    return results.length > 0 ? results[0].uniqueAccounts : 0;
  }

  /**
   * Get compliance prevention statistics for an organization
   */
  async getComplianceStats(organizationId: string, startDate: Date, endDate: Date) {
    const results = await this.logModel.aggregate([
      {
        $match: {
          organizationId,
          status: CommunicationStatus.BLOCKED,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$blockedReason',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalPrevented = results.reduce((sum, r) => sum + r.count, 0);
    const byType = results.reduce((acc, r) => {
      acc[r._id || 'Unknown'] = r.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPrevented,
      byType,
    };
  }

  /**
   * Get recent blocked attempts for live feed
   */
  async getRecentBlocked(organizationId: string, limit = 10) {
    return this.logModel
      .find({
        organizationId,
        status: CommunicationStatus.BLOCKED,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
