import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuditArchiveWindowDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  rangeStart: Date;

  @ApiProperty()
  rangeEnd: Date;

  @ApiProperty()
  objectKey: string;

  @ApiProperty()
  recordCount: number;

  @ApiProperty()
  checksum: string;
}

export class DeepHistoryBridgeResponseDto {
  @ApiProperty()
  organizationId: string;

  @ApiProperty({ type: [AuditArchiveWindowDto] })
  archives: AuditArchiveWindowDto[];
}

export class DeepHistoryReadResponseDto {
  @ApiProperty()
  organizationId: string;

  @ApiProperty({ type: Object })
  window: { startDate: string; endDate: string };

  @ApiProperty({ type: [Object] })
  hotLogs: Array<Record<string, unknown>>;

  @ApiProperty({ type: [Object] })
  archivedRecords: Array<Record<string, unknown>>;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  hotCount: number;

  @ApiProperty()
  archiveCount: number;
}

export class ArchiveLifecycleRunResponseDto {
  @ApiProperty()
  createdArchives: number;

  @ApiProperty()
  cutoffDate: Date;
}

export class PartitionMaintenanceResponseDto {
  @ApiProperty({ type: [String] })
  createdPartitions: string[];
}

export class ComplianceBriefResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  briefDate: string;

  @ApiProperty()
  totalLogs: number;

  @ApiProperty()
  anomalyCount: number;

  @ApiProperty()
  riskScore: number;

  @ApiProperty({ type: [Object] })
  topActions: Array<{ action: string; count: number }>;

  @ApiPropertyOptional({ type: Object, nullable: true })
  summary?: Record<string, unknown> | null;

  @ApiProperty()
  generatedAt: Date;
}

export class AuditOperationalMetricsResponseDto {
  @ApiProperty()
  ingestionLagSeconds: number;

  @ApiProperty()
  duplicateEventRate: number;

  @ApiProperty()
  chainBreakCount: number;

  @ApiProperty()
  requestP95Ms: number;

  @ApiProperty()
  partitionHorizonDays: number;
}

export class AuditCorrectnessCheckResponseDto {
  @ApiProperty()
  replayIdempotencyHealthy: boolean;

  @ApiProperty()
  lifecycleHealthy: boolean;

  @ApiProperty()
  notes: string;
}
