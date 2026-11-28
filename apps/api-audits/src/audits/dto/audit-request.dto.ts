import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { IActorSnapshot } from '@verichron/contracts';

const requestStatuses = ['PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const;

export class CreateAuditRequestDto {
  @ApiPropertyOptional({
    description: 'Audit request category (e.g., DEBTOR, COLLECTOR, PORTFOLIO, BULK, CUSTOM)',
    default: 'CUSTOM',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  requestType?: string = 'CUSTOM';

  @ApiPropertyOptional({ description: 'Filter by target entity type (e.g., DEBT, USER, PORTFOLIO)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  targetType?: string;

  @ApiPropertyOptional({ description: 'Filter by target entity ID' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  targetId?: string;

  @ApiPropertyOptional({ description: 'Filter by action' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string;

  @ApiPropertyOptional({ description: 'Generic search query (matches action, target ID, actor)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Start date for filtering (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Export format', default: 'JSON', enum: ['JSON'] })
  @IsOptional()
  @IsIn(['JSON'])
  format?: string = 'JSON';
}

export class AuditRequestQueryDto {
  @ApiPropertyOptional({ description: 'Filter by request status', enum: requestStatuses })
  @IsOptional()
  @IsIn(requestStatuses)
  status?: (typeof requestStatuses)[number];

  @ApiPropertyOptional({ description: 'Filter by request type (e.g., DEBTOR, BULK, CUSTOM)' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  requestType?: string;

  @ApiPropertyOptional({ description: 'Search text across request type and serialized filters' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Page number (1-indexed)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class AuditRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  requestType: string;

  @ApiProperty({ enum: requestStatuses })
  status: (typeof requestStatuses)[number];

  @ApiPropertyOptional()
  filters?: Record<string, any>;

  @ApiProperty()
  format: string;

  @ApiProperty()
  requestedBy: IActorSnapshot;

  @ApiPropertyOptional()
  recordCount?: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  artifactUrl?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  artifactChecksum?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  artifactMimeType?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @IsOptional()
  @IsNumber()
  artifactSizeBytes?: number | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  artifactData?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  errorMessage?: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  startedAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  completedAt?: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  expiresAt?: Date | null;

  @ApiProperty()
  createdAt: Date;
}

export class AuditRequestListResponseDto {
  @ApiProperty({ type: [AuditRequestResponseDto] })
  data: AuditRequestResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}

export class AuditRequestArtifactResponseDto {
  @ApiProperty()
  requestId: string;

  @ApiProperty()
  format: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  mimeType: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  checksum: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  sizeBytes: number | null;

  @ApiPropertyOptional({ type: Object, nullable: true })
  content: Record<string, unknown> | null;
}
