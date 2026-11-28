import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommunicationLog } from './logs/schemas/communication-log.schema';
import { Template } from './templates/entities/template.entity';
import { CommunicationStatus } from '@verichron/enums';
import { GatewayFactoryService } from './gateways/gateway-factory.service';

/**
 * Communications Ops Service
 *
 * Exclusively for Platform Admins (ui-ops).
 * Handles global log queries and template oversight.
 * STRICTLY SEPARATED from tenant business logic.
 */
@Injectable()
export class CommunicationsOpsService {
  private readonly logger = new Logger(CommunicationsOpsService.name);

  constructor(
    @InjectModel(CommunicationLog.name)
    private readonly logModel: Model<CommunicationLog>,
    @InjectRepository(Template)
    private readonly templatesRepo: Repository<Template>,
    private readonly gatewayFactory: GatewayFactoryService,
  ) {}

  // ==========================================================================
  // GATEWAY STATUS (Ops Only)
  // ==========================================================================

  /**
   * Get consolidated health status for all enabled communication gateways
   */
  async getGatewayStatus() {
    return this.gatewayFactory.getGatewayHealths();
  }

  // ==========================================================================
  // GLOBAL LOGS (MongoDB)
  // ==========================================================================

  /**
   * Find communication logs across all organizations.
   */
  async findAllLogs(filters: {
    organizationId?: string;
    debtorId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<CommunicationLog[]> {
    const query: any = {};

    if (filters.organizationId) query.organizationId = filters.organizationId;
    if (filters.debtorId) query.debtorId = filters.debtorId;
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

  // ==========================================================================
  // TEMPLATE OVERSIGHT (PostgreSQL)
  // ==========================================================================

  /**
   * List all templates in the system (System Wide)
   */
  async findAllTemplates(filters: {
    organizationId?: string;
    isActive?: boolean;
  }): Promise<Template[]> {
    const queryBuilder = this.templatesRepo.createQueryBuilder('template');

    if (filters.organizationId) {
      queryBuilder.andWhere('template.organization_id = :organizationId', { organizationId: filters.organizationId });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('template.is_active = :isActive', { isActive: filters.isActive });
    }

    return queryBuilder
      .orderBy('template.organization_id', 'ASC')
      .addOrderBy('template.name', 'ASC')
      .getMany();
  }
}
