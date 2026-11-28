import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditHashService } from './audit-hash.service';

@Injectable()
export class AuditLogWriterService {
  private readonly logger = new Logger(AuditLogWriterService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditHashService: AuditHashService,
  ) {}

  async writeAuditLog(params: {
    organizationId: string;
    eventId: string;
    action: string;
    targetType: string;
    targetId: string;
    actorSnapshot: AuditLog['actorSnapshot'];
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
    createdAt: Date;
  }): Promise<void> {
    const {
      organizationId,
      eventId,
      action,
      targetType,
      targetId,
      actorSnapshot,
      changes,
      metadata,
      createdAt,
    } = params;

    await this.dataSource.transaction(async (manager) => {
      // Serialize writes for the same event ID to guarantee idempotency under concurrency.
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`event:${eventId}`]);

      const existingLog = await manager
        .createQueryBuilder(AuditLog, 'log')
        .where('log.eventId = :eventId', { eventId })
        .limit(1)
        .getOne();
      if (existingLog) {
        await manager.query(
          `
            INSERT INTO audit_ingestion_daily(organization_id, metric_date, ingested_count, duplicate_count)
            VALUES ($1, CURRENT_DATE, 0, 1)
            ON CONFLICT (organization_id, metric_date)
            DO UPDATE SET duplicate_count = audit_ingestion_daily.duplicate_count + 1
          `,
          [organizationId],
        );
        this.logger.warn(`Duplicate event ignored from existing log check: ${eventId}`);
        return;
      }

      const dedupInsert = await manager.query(
        `
          INSERT INTO audit_event_dedup(event_id)
          VALUES ($1)
          ON CONFLICT (event_id) DO NOTHING
          RETURNING event_id
        `,
        [eventId],
      );

      if (!Array.isArray(dedupInsert) || dedupInsert.length === 0) {
        await manager.query(
          `
            INSERT INTO audit_ingestion_daily(organization_id, metric_date, ingested_count, duplicate_count)
            VALUES ($1, CURRENT_DATE, 0, 1)
            ON CONFLICT (organization_id, metric_date)
            DO UPDATE SET duplicate_count = audit_ingestion_daily.duplicate_count + 1
          `,
          [organizationId],
        );
        this.logger.warn(`Duplicate event ignored: ${eventId}`);
        return;
      }

      const chainKey = `${organizationId}|${targetType}|${targetId}`;
      await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [chainKey]);

      const previousLog = await manager.findOne(AuditLog, {
        where: {
          organizationId,
          targetType,
          targetId,
        },
        order: {
          createdAt: 'DESC',
        },
      });

      const prevHash = previousLog
        ? this.auditHashService.computeHash(
            previousLog,
            this.auditHashService.resolveHashVersion(previousLog),
          )
        : undefined;

      const auditLog = manager.create(AuditLog, {
        organizationId,
        eventId,
        actorSnapshot,
        action,
        targetType,
        targetId,
        changes,
        metadata: {
          ...(metadata ?? {}),
          hashVersion: 'v2',
        },
        prevHash,
        createdAt,
      });

      try {
        await manager.save(auditLog);
        await manager.query(
          `
            INSERT INTO audit_ingestion_daily(organization_id, metric_date, ingested_count, duplicate_count)
            VALUES ($1, CURRENT_DATE, 1, 0)
            ON CONFLICT (organization_id, metric_date)
            DO UPDATE SET ingested_count = audit_ingestion_daily.ingested_count + 1
          `,
          [organizationId],
        );
      } catch (error) {
        if (
          error instanceof QueryFailedError &&
          typeof (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code ===
            'string' &&
          (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505'
        ) {
          this.logger.warn(`Duplicate event ignored during write: ${eventId}`);
          return;
        }
        throw error;
      }
    });
  }
}
