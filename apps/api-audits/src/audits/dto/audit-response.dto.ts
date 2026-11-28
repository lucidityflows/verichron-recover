import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { IActorSnapshot, IChangeDelta, IChainVerificationResult, IBrokenLink, IAuditSystemStats } from '@verichron/contracts';

/**
 * Audit System Metrics
 */
export class AuditSystemStatsMetricsDto {
  @ApiProperty({ description: 'Total number of audit logs ingested' })
  totalLogs: number;

  @ApiProperty({ description: 'Number of logs ingested today (since midnight UTC)' })
  logsToday: number;

  @ApiPropertyOptional({ description: 'Timestamp of the most recent log', type: Date, nullable: true })
  lastLogAt: string | Date | null;
}

/**
 * Response DTO for system health statistics
 */
export class AuditSystemStatsResponseDto implements IAuditSystemStats {
  @ApiProperty({ description: 'System status', example: 'active' })
  status: string;

  @ApiProperty({ description: 'Service name', example: 'api-audits' })
  service: string;

  @ApiProperty({ description: 'Current operating mode', example: 'hash-chain-v1' })
  mode: string;

  @ApiProperty({ description: 'Infrastructure health info' })
  infrastructure?: {
    database: string;
    eventBridge: string;
  };

  @ApiProperty({ description: 'Key performance metrics' })
  metrics: AuditSystemStatsMetricsDto;

  @ApiProperty({ description: 'Report generation timestamp' })
  generatedAt: string | Date;
}

/**
 * Response DTO for a single audit log entry
 */
export class AuditLogResponseDto {
  @ApiProperty({ description: 'Audit log ID' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Event ID (idempotency key)' })
  eventId: string;

  @ApiProperty({ description: 'Snapshot of the actor at time of action' })
  actorSnapshot: IActorSnapshot;

  @ApiProperty({ description: 'Action performed (e.g., ORGANIZATION.ACTIVATED)' })
  action: string;

  @ApiProperty({ description: 'Target entity type (e.g., ORGANIZATION, DEBT)' })
  targetType: string;

  @ApiProperty({ description: 'Target entity ID' })
  targetId: string;

  @ApiPropertyOptional({ description: 'Field changes (old/new values)' })
  changes?: Record<string, IChangeDelta>;

  @ApiPropertyOptional({ description: 'Additional metadata (IP, correlation ID, etc.)' })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Hash of the previous record in the chain' })
  prevHash?: string;

  @ApiProperty({ description: 'Timestamp of the action' })
  createdAt: Date;
}

/**
 * Paginated response for audit log list
 */
export class AuditLogListResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto], description: 'List of audit logs' })
  data: AuditLogResponseDto[];

  @ApiProperty({ description: 'Total number of records matching the query' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  pageSize: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

/**
 * Response DTO for broken link details
 */
export class BrokenLinkDto implements IBrokenLink {
  @ApiProperty({ description: 'ID of the record with the broken link' })
  recordId: string;

  @ApiProperty({ description: 'Position in the chain (0-indexed)' })
  position: number;

  @ApiProperty({ description: 'Description of the issue' })
  issue: string;

  @ApiPropertyOptional({ description: 'Expected hash value' })
  expectedHash: string | null;

  @ApiPropertyOptional({ description: 'Actual hash value found' })
  actualHash: string | null;
}

/**
 * Response DTO for chain verification
 */
export class ChainVerificationResponseDto implements IChainVerificationResult {
  @ApiProperty({ description: 'Whether the entire chain is valid' })
  valid: boolean;

  @ApiProperty({ description: 'Total number of records in the chain' })
  totalRecords: number;

  @ApiProperty({ description: 'Number of records that passed verification' })
  verifiedRecords: number;

  @ApiProperty({ type: [BrokenLinkDto], description: 'Details of any broken links' })
  brokenLinks: BrokenLinkDto[];
}
