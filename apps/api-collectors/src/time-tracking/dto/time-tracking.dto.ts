import {
  IsUUID,
  IsOptional,
  IsObject,
  IsDateString,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimeTrackingSessionStatus } from '@verichron/enums';

/**
 * DTO for starting a new time tracking session
 */
export class StartSessionDto {
  @IsUUID()
  @ApiProperty({
    description: 'Debtor ID this session is associated with (optional - can track general work)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  debtorId?: string;

  @IsObject()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Additional metadata for the session',
    example: {
      activityType: 'phone_call',
      notes: 'Initial contact attempt',
      tags: ['first-contact'],
    },
  })
  metadata?: Record<string, any>;
}

/**
 * DTO for ending a time tracking session
 */
export class EndSessionDto {
  @IsObject()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Additional metadata to add when ending the session',
    example: {
      outcome: 'Payment arranged',
      followUpRequired: true,
    },
  })
  metadata?: Record<string, any>;
}

/**
 * Time Tracking Session Response DTO
 */
export class TimeTrackingSessionResponseDto {
  @ApiProperty({
    description: 'Session ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Collector user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  collectorUserId: string;

  @ApiPropertyOptional({
    description: 'Debtor ID (if session is debtor-specific)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  debtorId?: string;

  @ApiProperty({
    description: 'Session start time',
    example: '2025-01-15T10:00:00Z',
  })
  startTime: string;

  @ApiPropertyOptional({
    description: 'Session end time',
    example: '2025-01-15T11:30:00Z',
  })
  endTime?: string;

  @ApiProperty({
    description: 'Session status',
    enum: TimeTrackingSessionStatus,
    enumName: 'TimeTrackingSessionStatus',
    example: TimeTrackingSessionStatus.ACTIVE,
  })
  status: TimeTrackingSessionStatus;

  @ApiProperty({
    description: 'Total active time in seconds',
    example: 3600,
  })
  totalActiveSeconds: number;

  @ApiProperty({
    description: 'Total idle time in seconds',
    example: 300,
  })
  totalIdleSeconds: number;

  @ApiProperty({
    description: 'Total duration in seconds (active + idle)',
    example: 3900,
  })
  totalDurationSeconds: number;

  @ApiPropertyOptional({
    description: 'Session metadata',
    example: {
      activityType: 'phone_call',
      notes: 'Payment arrangement discussed',
    },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Session created timestamp',
    example: '2025-01-15T10:00:00Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Session updated timestamp',
    example: '2025-01-15T11:30:00Z',
  })
  updatedAt: string;
}

/**
 * Query DTO for searching time tracking sessions
 */
export class TimeTrackingQueryDto {
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter by debtor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  debtorId?: string;

  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter by collector user ID (admin/manager use)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  collectorUserId?: string;

  @IsEnum(TimeTrackingSessionStatus)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter by session status',
    enum: TimeTrackingSessionStatus,
    enumName: 'TimeTrackingSessionStatus',
    example: TimeTrackingSessionStatus.COMPLETED,
  })
  status?: TimeTrackingSessionStatus;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter sessions starting on or after this date',
    example: '2025-01-01T00:00:00Z',
  })
  startDate?: string;

  @IsDateString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter sessions ending on or before this date',
    example: '2025-01-31T23:59:59Z',
  })
  endDate?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Number of results to return',
    example: 50,
    default: 50,
  })
  limit?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Number of results to skip',
    example: 0,
    default: 0,
  })
  offset?: number;
}

/**
 * Collector Time Utilization Report DTO
 */
export class CollectorTimeReportDto {
  @ApiProperty({
    description: 'Collector user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  collectorUserId: string;

  @ApiProperty({
    description: 'Report start date',
    example: '2025-01-01T00:00:00Z',
  })
  startDate: string;

  @ApiProperty({
    description: 'Report end date',
    example: '2025-01-31T23:59:59Z',
  })
  endDate: string;

  @ApiProperty({
    description: 'Total number of sessions',
    example: 120,
  })
  totalSessions: number;

  @ApiProperty({
    description: 'Total active time in seconds',
    example: 172800,
  })
  totalActiveSeconds: number;

  @ApiProperty({
    description: 'Total idle time in seconds',
    example: 14400,
  })
  totalIdleSeconds: number;

  @ApiProperty({
    description: 'Total time (active + idle) in seconds',
    example: 187200,
  })
  totalSeconds: number;

  @ApiProperty({
    description: 'Average active time per session in seconds',
    example: 1440,
  })
  avgActiveSecondsPerSession: number;

  @ApiProperty({
    description: 'Average session duration in seconds',
    example: 1560,
  })
  avgSessionDurationSeconds: number;

  @ApiProperty({
    description: 'Utilization rate (active time / total time) as percentage',
    example: 92.3,
  })
  utilizationRate: number;

  @ApiProperty({
    description: 'Number of unique debtors worked on',
    example: 45,
  })
  uniqueDebtorsCount: number;

  @ApiPropertyOptional({
    description: 'Daily breakdown of time metrics',
    type: [Object],
    example: [
      {
        date: '2025-01-15',
        sessions: 8,
        activeSeconds: 7200,
        idleSeconds: 600,
        utilizationRate: 92.3,
      },
    ],
  })
  dailyBreakdown?: Array<{
    date: string;
    sessions: number;
    activeSeconds: number;
    idleSeconds: number;
    utilizationRate: number;
  }>;
}

/**
 * Query DTO for time utilization reports
 */
export class TimeReportQueryDto {
  @IsUUID()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter by specific collector (admin/manager use)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  collectorUserId?: string;

  @IsDateString()
  @ApiProperty({
    description: 'Report start date',
    example: '2025-01-01T00:00:00Z',
  })
  startDate: string;

  @IsDateString()
  @ApiProperty({
    description: 'Report end date',
    example: '2025-01-31T23:59:59Z',
  })
  endDate: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Include daily breakdown',
    example: true,
    default: false,
  })
  includeDailyBreakdown?: boolean;
}
