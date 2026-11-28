import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import type { IChainVerificationResult, IBrokenLink } from '@verichron/contracts';
import { SortOrder } from '@verichron/enums';
import { AuditLog } from '../entities/audit-log.entity';

/**
 * AuditHashService - Cryptographic Hash Chaining for Audit Logs
 *
 * Implements per-entity hash chaining as defined in AUDITS-API-PROPOSAL.md Section A.2.1.
 *
 * CHAINING STRATEGY:
 * - Logs are chained per (organizationId, targetType, targetId)
 * - A debt's audit history chains to itself, not to unrelated organization events
 * - This eliminates write contention and aligns with compliance queries
 *
 * HASH ALGORITHM:
 * - SHA-256 (64 character hex string)
 * - Deterministic payload: id, eventId, action, targetId, changes, createdAt
 *
 * TAMPER DETECTION:
 * - If a record is modified, its hash changes
 * - The next record's prevHash no longer matches
 * - Chain verification can detect the break point
 */
@Injectable()
export class AuditHashService {
  private readonly logger = new Logger(AuditHashService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Computes a SHA-256 hash of an audit log record.
   *
   * The hash includes only immutable, deterministic fields to ensure
   * consistent verification across time and systems.
   *
   * @param log The audit log record to hash
   * @returns 64-character lowercase hex string
   */
  computeHash(log: AuditLog, version: 'v1' | 'v2' = 'v2'): string {
    return version === 'v2'
      ? this.computeHashV2(log)
      : this.computeHashV1(log);
  }

  private computeHashV1(log: AuditLog): string {
    const payload = JSON.stringify({
      id: log.id,
      eventId: log.eventId,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      changes: log.changes,
      createdAt: log.createdAt instanceof Date
        ? log.createdAt.toISOString()
        : log.createdAt,
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  private computeHashV2(log: AuditLog): string {
    const payload = JSON.stringify({
      id: log.id,
      organizationId: log.organizationId,
      eventId: log.eventId,
      actorSnapshot: log.actorSnapshot,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      changes: log.changes,
      metadata: log.metadata,
      prevHash: log.prevHash ?? null,
      createdAt: log.createdAt instanceof Date
        ? log.createdAt.toISOString()
        : log.createdAt,
    });

    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Retrieves the hash of the most recent audit log for a specific entity.
   *
   * This is used to populate the `prevHash` field when creating a new log,
   * establishing the chain link.
   *
   * @param organizationId The organization scope
   * @param targetType The entity type (e.g., 'DEBT', 'ORGANIZATION')
   * @param targetId The entity ID
   * @returns The hash of the previous log, or null if this is the genesis record
   */
  async getPreviousHash(
    organizationId: string,
    targetType: string,
    targetId: string,
  ): Promise<string | null> {
    const previousLog = await this.auditLogRepository.findOne({
      where: {
        organizationId,
        targetType,
        targetId,
      },
      order: {
        createdAt: SortOrder.DESC,
      },
    });

    if (!previousLog) {
      // Genesis record for this entity - no previous hash
      return null;
    }

    return this.computeHash(previousLog, this.resolveHashVersion(previousLog));
  }

  /**
   * Verifies the integrity of an audit chain for a specific entity.
   *
   * Walks backward through the chain, verifying each prevHash matches
   * the computed hash of the previous record.
   *
   * @param organizationId The organization scope
   * @param targetType The entity type
   * @param targetId The entity ID
   * @returns Verification result with any broken links identified
   */
  async verifyChain(
    organizationId: string,
    targetType: string,
    targetId: string,
  ): Promise<IChainVerificationResult> {
    const logs = await this.auditLogRepository.find({
      where: {
        organizationId,
        targetType,
        targetId,
      },
      order: {
        createdAt: SortOrder.ASC, // Oldest first for forward verification
      },
    });

    if (logs.length === 0) {
      return {
        valid: true,
        totalRecords: 0,
        verifiedRecords: 0,
        brokenLinks: [],
      };
    }

    const brokenLinks: IBrokenLink[] = [];
    let verifiedCount = 0;

    for (let i = 0; i < logs.length; i++) {
      const current = logs[i];

      if (i === 0) {
        // Genesis record should have null prevHash
        if (current.prevHash !== null && current.prevHash !== undefined) {
          brokenLinks.push({
            recordId: current.id,
            position: i,
            issue: 'Genesis record has non-null prevHash',
            expectedHash: null,
            actualHash: current.prevHash,
          });
        } else {
          verifiedCount++;
        }
      } else {
        // Non-genesis records should have prevHash matching previous record's hash
        const previous = logs[i - 1];
        const expectedVersion = this.resolveHashVersion(previous);
        const expectedHash = this.computeHash(previous, expectedVersion);

        if (current.prevHash !== expectedHash) {
          brokenLinks.push({
            recordId: current.id,
            position: i,
            issue: 'prevHash does not match computed hash of previous record',
            expectedHash,
            actualHash: current.prevHash || null,
          });
        } else {
          verifiedCount++;
        }
      }
    }

    const isValid = brokenLinks.length === 0;

    if (!isValid) {
      this.logger.warn(
        `Chain verification failed for ${targetType}:${targetId} in org ${organizationId}. ` +
        `Found ${brokenLinks.length} broken links.`,
      );
    }

    return {
      valid: isValid,
      totalRecords: logs.length,
      verifiedRecords: verifiedCount,
      brokenLinks,
    };
  }

  resolveHashVersion(log: AuditLog): 'v1' | 'v2' {
    const hashVersion = (log.metadata as { hashVersion?: unknown } | undefined)?.hashVersion;
    return hashVersion === 'v2' ? 'v2' : 'v1';
  }
}
