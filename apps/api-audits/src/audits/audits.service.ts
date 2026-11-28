import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import * as crypto from 'crypto';
import type { IChainVerificationResult } from '@verichron/contracts';
import type { IActorSnapshot } from '@verichron/contracts';
import { SortOrder } from '@verichron/enums';
import { AuditLog } from '../storage/entities/audit-log.entity';
import { AuditRequest } from '../storage/entities/audit-request.entity';
import { AuditArchive } from '../storage/entities/audit-archive.entity';
import { ComplianceBrief } from '../storage/entities/compliance-brief.entity';
import { AuditHashService } from '../storage/services/audit-hash.service';
import {
  AuditQueryDto,
  AuditLogListResponseDto,
  CreateAuditRequestDto,
  AuditRequestQueryDto,
  AuditRequestListResponseDto,
  DeepHistoryReadResponseDto,
  PartitionMaintenanceResponseDto,
} from './dto';

@Injectable()
export class AuditsService {
  private readonly logger = new Logger(AuditsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(AuditRequest)
    private readonly auditRequestRepository: Repository<AuditRequest>,
    @InjectRepository(AuditArchive)
    private readonly auditArchiveRepository: Repository<AuditArchive>,
    @InjectRepository(ComplianceBrief)
    private readonly complianceBriefRepository: Repository<ComplianceBrief>,
    private readonly auditHashService: AuditHashService,
  ) {}

  /**
   * List audit logs for an organization with filtering and pagination
   */
  async findAll(
    organizationId: string,
    query: AuditQueryDto,
  ): Promise<AuditLogListResponseDto> {
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
    queryBuilder.where('log.organizationId = :organizationId', { organizationId });

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
        new Brackets((qb) => {
          qb.where('log.action ILIKE :search', { search: `%${search}%` })
            .orWhere('log.targetId ILIKE :search', { search: `%${search}%` })
            .orWhere("log.actorSnapshot->>'name' ILIKE :search", { search: `%${search}%` });
        }),
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
   * Get a single audit log by ID
   */
  async findOne(organizationId: string, id: string): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({
      where: { organizationId, id },
    });
  }

  /**
   * Get the audit trail for a specific entity (chain of custody)
   */
  async getEntityHistory(
    organizationId: string,
    targetType: string,
    targetId: string,
  ): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: {
        organizationId,
        targetType,
        targetId,
      },
      order: { createdAt: SortOrder.ASC },
    });
  }

  /**
   * Verify the integrity of an entity's audit chain
   */
  async verifyChain(
    organizationId: string,
    targetType: string,
    targetId: string,
  ): Promise<IChainVerificationResult> {
    return this.auditHashService.verifyChain(organizationId, targetType, targetId);
  }

  async createRequest(
    organizationId: string,
    actor: IActorSnapshot,
    dto: CreateAuditRequestDto,
  ): Promise<AuditRequest> {
    this.assertValidDateRange(dto.startDate, dto.endDate);

    const filters = {
      targetType: dto.targetType,
      targetId: dto.targetId,
      action: dto.action,
      search: dto.search,
      startDate: dto.startDate,
      endDate: dto.endDate,
    };

    const auditRequest = this.auditRequestRepository.create({
      organizationId,
      requestType: dto.requestType ?? 'CUSTOM',
      status: 'PENDING',
      filters,
      format: 'JSON',
      requestedBy: actor,
    });

    const created = await this.auditRequestRepository.save(auditRequest);

    this.processRequestAsync(created.id);

    return this.findRequestById(organizationId, created.id);
  }

  async findRequests(
    organizationId: string,
    query: AuditRequestQueryDto,
  ): Promise<AuditRequestListResponseDto> {
    const { status, requestType, search, page = 1, pageSize = 20 } = query;
    const qb = this.auditRequestRepository.createQueryBuilder('request');
    qb.where('request.organizationId = :organizationId', { organizationId });

    if (status) {
      qb.andWhere('request.status = :status', { status });
    }

    if (requestType) {
      qb.andWhere('request.requestType = :requestType', { requestType });
    }

    if (search) {
      qb.andWhere(
        new Brackets((inner) => {
          inner
            .where('request.requestType ILIKE :search', { search: `%${search}%` })
            .orWhere("CAST(request.filters AS text) ILIKE :search", { search: `%${search}%` });
        }),
      );
    }

    const skip = (page - 1) * pageSize;
    const [data, total] = await qb
      .orderBy('request.createdAt', SortOrder.DESC)
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findRequestById(organizationId: string, requestId: string): Promise<AuditRequest> {
    return this.auditRequestRepository.findOneOrFail({
      where: { organizationId, id: requestId },
    });
  }

  async getRequestArtifact(organizationId: string, requestId: string): Promise<{
    requestId: string;
    format: string;
    mimeType: string | null;
    checksum: string | null;
    sizeBytes: number | null;
    content: Record<string, unknown> | null;
  }> {
    const request = await this.findRequestById(organizationId, requestId);
    return {
      requestId: request.id,
      format: request.format,
      mimeType: request.artifactMimeType ?? null,
      checksum: request.artifactChecksum ?? null,
      sizeBytes: request.artifactSizeBytes ?? null,
      content: request.artifactData ?? null,
    };
  }

  private async countLogsForRequest(
    organizationId: string,
    dto: CreateAuditRequestDto,
  ): Promise<number> {
    const queryBuilder = this.buildRequestLogQuery(organizationId, dto);
    return await queryBuilder.getCount();
  }

  private processRequestAsync(requestId: string): void {
    setTimeout(() => {
      void this.processRequest(requestId);
    }, 0);
  }

  private async processRequest(requestId: string): Promise<void> {
    const request = await this.auditRequestRepository.findOne({
      where: { id: requestId },
    });
    if (request?.status !== 'PENDING') {
      return;
    }

    await this.auditRequestRepository.update(request.id, {
      status: 'RUNNING',
      startedAt: new Date(),
      errorMessage: null,
    });

    try {
      const filters = (request.filters ?? {}) as CreateAuditRequestDto;
      const queryBuilder = this.buildRequestLogQuery(request.organizationId, filters);
      const logs = await queryBuilder.orderBy('log.createdAt', SortOrder.DESC).getMany();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24);

      const artifactPayload = {
        requestId: request.id,
        generatedAt: now.toISOString(),
        organizationId: request.organizationId,
        format: request.format,
        filters: request.filters ?? {},
        totalRecords: logs.length,
        records: logs.map((log) => ({
          id: log.id,
          eventId: log.eventId,
          actorSnapshot: log.actorSnapshot,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          changes: log.changes ?? null,
          metadata: log.metadata ?? null,
          prevHash: log.prevHash ?? null,
          createdAt: log.createdAt,
        })),
      };

      const serialized = JSON.stringify(artifactPayload);
      const checksum = crypto.createHash('sha256').update(serialized).digest('hex');
      const sizeBytes = Buffer.byteLength(serialized, 'utf8');

      await this.auditRequestRepository.update(request.id, {
        status: 'SUCCEEDED',
        recordCount: logs.length,
        artifactUrl: `/v1/audits/orgs/${request.organizationId}/requests/${request.id}/artifact`,
        artifactChecksum: checksum,
        artifactMimeType: 'application/json',
        artifactSizeBytes: sizeBytes,
        artifactData: artifactPayload,
        completedAt: now,
        expiresAt,
      });
    } catch (error) {
      this.logger.error('Audit request generation failed', error as Error);
      await this.auditRequestRepository.update(request.id, {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown generation failure',
        completedAt: new Date(),
      });
    }
  }

  private buildRequestLogQuery(organizationId: string, dto: CreateAuditRequestDto) {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('log');
    queryBuilder.where('log.organizationId = :organizationId', { organizationId });

    if (dto.targetType) {
      queryBuilder.andWhere('log.targetType = :targetType', { targetType: dto.targetType });
    }

    if (dto.targetId) {
      queryBuilder.andWhere('log.targetId = :targetId', { targetId: dto.targetId });
    }

    if (dto.action) {
      queryBuilder.andWhere('log.action = :action', { action: dto.action });
    }

    if (dto.search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('log.action ILIKE :search', { search: `%${dto.search}%` })
            .orWhere('log.targetId ILIKE :search', { search: `%${dto.search}%` })
            .orWhere("log.actorSnapshot->>'name' ILIKE :search", { search: `%${dto.search}%` });
        }),
      );
    }

    if (dto.startDate) {
      queryBuilder.andWhere('log.createdAt >= :startDate', {
        startDate: new Date(dto.startDate),
      });
    }

    if (dto.endDate) {
      queryBuilder.andWhere('log.createdAt <= :endDate', {
        endDate: new Date(dto.endDate),
      });
    }

    return queryBuilder;
  }

  async runArchiveLifecycle(
    organizationId: string,
    olderThanDays = 90,
  ): Promise<{ createdArchives: number; cutoffDate: Date }> {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const rows = await this.auditLogRepository.query(
      `
        SELECT
          organization_id AS "organizationId",
          date_trunc('month', created_at) AS "rangeStart",
          (date_trunc('month', created_at) + interval '1 month') AS "rangeEnd",
          count(*)::int AS "recordCount"
        FROM audit_logs
        WHERE created_at < $1
          AND organization_id = $2
        GROUP BY organization_id, date_trunc('month', created_at)
      `,
      [cutoffDate.toISOString(), organizationId],
    );

    let createdArchives = 0;
    for (const row of rows as {
      organizationId: string;
      rangeStart: string;
      rangeEnd: string;
      recordCount: number;
    }[]) {
      const rangeStart = new Date(row.rangeStart);
      const rangeEnd = new Date(row.rangeEnd);
      const existing = await this.auditArchiveRepository.findOne({
        where: { organizationId: row.organizationId, rangeStart, rangeEnd },
      });
      if (existing) {
        continue;
      }

      const monthSlug = rangeStart.toISOString().slice(0, 7);
      const checksum = crypto
        .createHash('sha256')
        .update(`${row.organizationId}:${monthSlug}:${row.recordCount}`)
        .digest('hex');
      const archive = this.auditArchiveRepository.create({
        organizationId: row.organizationId,
        rangeStart,
        rangeEnd,
        objectKey: `gcs://verichron-audits-archive/${row.organizationId}/${monthSlug}.parquet`,
        recordCount: row.recordCount,
        checksum,
      });
      await this.auditArchiveRepository.save(archive);
      createdArchives += 1;
    }

    return { createdArchives, cutoffDate };
  }

  async getDeepHistoryBridge(
    organizationId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{ organizationId: string; archives: AuditArchive[] }> {
    const qb = this.auditArchiveRepository.createQueryBuilder('archive');
    qb.where('archive.organizationId = :organizationId', { organizationId });

    if (startDate) {
      qb.andWhere('archive.rangeEnd >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      qb.andWhere('archive.rangeStart <= :endDate', { endDate: new Date(endDate) });
    }

    const archives = await qb.orderBy('archive.rangeStart', SortOrder.DESC).getMany();
    return { organizationId, archives };
  }

  async getDeepHistoryRecords(
    organizationId: string,
    startDate: string,
    endDate: string,
    page = 1,
    pageSize = 50,
  ): Promise<DeepHistoryReadResponseDto> {
    const qb = this.auditLogRepository.createQueryBuilder('log');
    qb.where('log.organizationId = :organizationId', { organizationId })
      .andWhere('log.createdAt >= :startDate', { startDate: new Date(startDate) })
      .andWhere('log.createdAt <= :endDate', { endDate: new Date(endDate) });

    const skip = (page - 1) * pageSize;
    const [hotLogs, hotCount] = await qb
      .orderBy('log.createdAt', SortOrder.DESC)
      .skip(skip)
      .take(pageSize)
      .getManyAndCount();

    return {
      organizationId,
      window: { startDate, endDate },
      hotLogs: hotLogs as unknown as Array<Record<string, unknown>>,
      archivedRecords: [],
      page,
      pageSize,
      hotCount,
      archiveCount: 0,
    };
  }

  async ensureFuturePartitions(
    _monthsAhead = 6,
  ): Promise<PartitionMaintenanceResponseDto> {
    return {
      createdPartitions: [],
    };
  }

  async runNightlyComplianceBrief(
    organizationId: string,
    briefDate?: string,
  ): Promise<ComplianceBrief> {
    const targetDate = briefDate ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const start = new Date(`${targetDate}T00:00:00.000Z`);
    const end = new Date(`${targetDate}T23:59:59.999Z`);

    const totalLogs = await this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.organizationId = :organizationId', { organizationId })
      .andWhere('log.createdAt >= :start', { start })
      .andWhere('log.createdAt <= :end', { end })
      .getCount();

    const anomalyCount = await this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.organizationId = :organizationId', { organizationId })
      .andWhere('log.createdAt >= :start', { start })
      .andWhere('log.createdAt <= :end', { end })
      .andWhere(`(log.action ILIKE :failed OR log.action ILIKE :error)`, {
        failed: '%FAILED%',
        error: '%ERROR%',
      })
      .getCount();

    const topActionsRaw = await this.auditLogRepository
      .createQueryBuilder('log')
      .select('log.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('log.organizationId = :organizationId', { organizationId })
      .andWhere('log.createdAt >= :start', { start })
      .andWhere('log.createdAt <= :end', { end })
      .groupBy('log.action')
      .orderBy('count', SortOrder.DESC)
      .limit(5)
      .getRawMany<{ action: string; count: string }>();

    const topActions = topActionsRaw.map((entry) => ({
      action: entry.action,
      count: Number(entry.count),
    }));
    const riskScore = Math.min(100, anomalyCount * 10);
    const summary = {
      generatedFor: targetDate,
      signal: riskScore >= 60 ? 'HIGH_RISK' : riskScore >= 30 ? 'ELEVATED' : 'NORMAL',
      note: anomalyCount > 0
        ? 'Potential compliance anomalies detected in daily activity.'
        : 'No anomaly signatures detected.',
    };

    const existing = await this.complianceBriefRepository.findOne({
      where: { organizationId, briefDate: targetDate },
    });
    const payload = {
      organizationId,
      briefDate: targetDate,
      totalLogs,
      anomalyCount,
      riskScore,
      topActions,
      summary,
    };
    if (existing) {
      await this.complianceBriefRepository.update(existing.id, payload);
      return this.complianceBriefRepository.findOneOrFail({ where: { id: existing.id } });
    }

    return await this.complianceBriefRepository.save(this.complianceBriefRepository.create(payload));
  }

  async getLatestComplianceBrief(organizationId: string): Promise<ComplianceBrief | null> {
    return await this.complianceBriefRepository.findOne({
      where: { organizationId },
      order: { generatedAt: SortOrder.DESC },
    });
  }

  async getOperationalMetrics(organizationId: string): Promise<{
    ingestionLagSeconds: number;
    duplicateEventRate: number;
    chainBreakCount: number;
    requestP95Ms: number;
    partitionHorizonDays: number;
  }> {
    const latestLog = await this.auditLogRepository.findOne({
      where: { organizationId },
      order: { createdAt: SortOrder.DESC },
    });
    const ingestionLagSeconds = latestLog
      ? Math.max(0, Math.floor((Date.now() - new Date(latestLog.createdAt).getTime()) / 1000))
      : 0;

    const [todayIngestion] = await this.auditLogRepository.query(
      `
        SELECT ingested_count AS "ingestedCount", duplicate_count AS "duplicateCount"
        FROM audit_ingestion_daily
        WHERE metric_date = CURRENT_DATE
      `,
    );
    const ingestedCount = Number(todayIngestion?.ingestedCount ?? 0);
    const duplicateCount = Number(todayIngestion?.duplicateCount ?? 0);
    const denominator = ingestedCount + duplicateCount;
    const duplicateEventRate = denominator > 0 ? duplicateCount / denominator : 0;

    const [requestP95Row] = await this.auditRequestRepository.query(
      `
        SELECT
          COALESCE(
            percentile_cont(0.95) WITHIN GROUP (
              ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
            ),
            0
          ) AS "requestP95Ms"
        FROM audit_requests
        WHERE organization_id = $1
          AND started_at IS NOT NULL
          AND completed_at IS NOT NULL
          AND created_at >= NOW() - interval '7 days'
      `,
      [organizationId],
    );
    const requestP95Ms = Number(requestP95Row?.requestP95Ms ?? 0);

    const maxArchive = await this.auditArchiveRepository
      .createQueryBuilder('archive')
      .where('archive.organizationId = :organizationId', { organizationId })
      .orderBy('archive.rangeEnd', SortOrder.DESC)
      .getOne();
    const partitionHorizonDays = maxArchive
      ? Math.max(
        0,
        Math.floor(
          (new Date(maxArchive.rangeEnd).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
        ),
      )
      : 0;

    return {
      ingestionLagSeconds,
      duplicateEventRate,
      chainBreakCount: 0,
      requestP95Ms,
      partitionHorizonDays,
    };
  }

  async runCorrectnessChecks(organizationId: string): Promise<{
    replayIdempotencyHealthy: boolean;
    lifecycleHealthy: boolean;
    notes: string;
  }> {
    const runningTooLong = await this.auditRequestRepository
      .createQueryBuilder('request')
      .where('request.organizationId = :organizationId', { organizationId })
      .andWhere('request.status IN (:...statuses)', { statuses: ['PENDING', 'RUNNING'] })
      .andWhere('request.createdAt < :cutoff', {
        cutoff: new Date(Date.now() - 30 * 60 * 1000),
      })
      .getCount();

    const [dupHealthRow] = await this.auditLogRepository.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE duplicate_count > ingested_count * 2) AS unhealthy_days
        FROM audit_ingestion_daily
        WHERE metric_date >= CURRENT_DATE - interval '7 days'
      `,
    );
    const unhealthyDays = Number(dupHealthRow?.unhealthy_days ?? 0);

    return {
      replayIdempotencyHealthy: unhealthyDays === 0,
      lifecycleHealthy: runningTooLong === 0,
      notes: runningTooLong === 0
        ? 'No stale request lifecycles detected.'
        : `${runningTooLong} request(s) are pending/running beyond 30 minutes.`,
    };
  }

  private assertValidDateRange(startDate?: string, endDate?: string): void {
    if (!startDate || !endDate) {
      return;
    }

    if (new Date(startDate).getTime() > new Date(endDate).getTime()) {
      throw new BadRequestException('startDate cannot be after endDate');
    }
  }

  private buildQueryString(dto: CreateAuditRequestDto): string {
    const params = new URLSearchParams();

    if (dto.targetType) params.set('targetType', dto.targetType);
    if (dto.targetId) params.set('targetId', dto.targetId);
    if (dto.action) params.set('action', dto.action);
    if (dto.search) params.set('search', dto.search);
    if (dto.startDate) params.set('startDate', dto.startDate);
    if (dto.endDate) params.set('endDate', dto.endDate);

    return params.toString();
  }
}
