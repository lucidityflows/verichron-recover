import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { startOfDay } from 'date-fns';
import { PLATFORM_ORG_ID } from '@verichron/contracts';
import { SortOrder } from '@verichron/enums';
import { AuditLog } from '../storage/entities/audit-log.entity';
import { AuditHashService } from '../storage/services/audit-hash.service';
import { AuditQueryDto, AuditLogListResponseDto, AuditSystemStatsResponseDto, ChainVerificationResponseDto } from './dto';

@Injectable()
export class AuditsOpsService {
  private readonly logger = new Logger(AuditsOpsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly auditHashService: AuditHashService,
  ) {}

  /**
   * List platform-level audit logs
   */
  async findPlatformLogs(query: AuditQueryDto): Promise<AuditLogListResponseDto> {
    this.logger.log('Fetching platform-level audit logs');

    const {
      targetType,
      targetId,
      action,
      search,
      actorId,
      startDate,
      endDate,
      page = 1,
      pageSize = 50,
    } = query;

    const queryBuilder = this.auditLogRepository.createQueryBuilder('log');

    // Platform level logs are scoped to PLATFORM_ORG_ID
    queryBuilder.where('log.organizationId = :orgId', { orgId: PLATFORM_ORG_ID });

    if (targetType) {
      queryBuilder.andWhere('log.targetType = :targetType', { targetType });
    }

    if (targetId) {
      queryBuilder.andWhere('log.targetId = :targetId', { targetId });
    }

    if (action) {
      queryBuilder.andWhere('log.action = :action', { action });
    }

    if (actorId) {
      queryBuilder.andWhere("log.actorSnapshot->>'id' = :actorId", { actorId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(log.action ILIKE :search OR log.targetId ILIKE :search OR log.actorSnapshot->>\'name\' ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [data, total] = await queryBuilder
      .orderBy('log.createdAt', SortOrder.DESC)
      .skip(skip)
      .take(take)
      .getManyAndCount();

    const totalPages = Math.ceil(total / pageSize);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get basic health statistics for the audit system
   */
  async getSystemStats(): Promise<AuditSystemStatsResponseDto> {
    this.logger.log('Generating system-wide audit statistics');

    const [totalLogs, logsToday, lastLog] = await Promise.all([
      this.auditLogRepository.count(),
      this.auditLogRepository.count({
        where: { createdAt: MoreThanOrEqual(startOfDay(new Date())) },
      }),
      this.auditLogRepository.findOne({
        where: {},
        order: { createdAt: SortOrder.DESC },
        select: ['createdAt'],
      }),
    ]);

    // Check DB connectivity
    let dbStatus = 'connected';
    try {
      await this.auditLogRepository.query('SELECT 1');
    } catch (_e) {
      dbStatus = 'disconnected';
    }

    return {
      status: 'active',
      service: 'api-audits',
      mode: 'hash-chain-v1',
      infrastructure: {
        database: dbStatus,
        eventBridge: 'connected', // For now, assume connected if service is up
      },
      metrics: {
        totalLogs,
        logsToday,
        lastLogAt: lastLog?.createdAt || null,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Verify the integrity of an organization's audit chain
   */
  async verifyChain(
    organizationId: string,
    targetType: string,
    targetId: string,
  ): Promise<ChainVerificationResponseDto> {
    return this.auditHashService.verifyChain(organizationId, targetType, targetId);
  }
}
