import { ApiProperty } from '@nestjs/swagger';
import { TrendGranularity } from '@verichron/enums';

/**
 * Today's collector performance stats
 */
export class CollectorTodayStatsDto {
  @ApiProperty({
    description: 'Number of calls made today',
    example: 45,
  })
  callsMade!: number;

  @ApiProperty({
    description: 'Number of emails sent today',
    example: 23,
  })
  emailsSent!: number;

  @ApiProperty({
    description: 'Number of unique accounts contacted today',
    example: 38,
  })
  accountsContacted!: number;

  @ApiProperty({
    description: 'Total amount collected today (in cents)',
    example: 1250000,
  })
  collectedToday!: number;

  @ApiProperty({
    description: 'Percentage change vs yesterday',
    example: 12.5,
    required: false,
  })
  callsTrend?: number;

  @ApiProperty({
    description: 'Email response rate percentage',
    example: 78.3,
    required: false,
  })
  emailResponseRate?: number;
}

/**
 * This week's collector performance stats
 */
export class CollectorWeekStatsDto {
  @ApiProperty({
    description: 'Total calls made this week',
    example: 187,
  })
  totalCalls!: number;

  @ApiProperty({
    description: 'Number of accounts resolved/completed this week',
    example: 12,
  })
  accountsResolved!: number;

  @ApiProperty({
    description: 'Total amount collected this week (in cents)',
    example: 5820000,
  })
  totalCollected!: number;

  @ApiProperty({
    description: 'Recovery rate percentage',
    example: 32.4,
  })
  recoveryRate!: number;

  @ApiProperty({
    description: 'Total accounts worked on this week',
    example: 85,
    required: false,
  })
  totalAccountsWorked?: number;

  @ApiProperty({
    description: 'Average time to contact (in minutes)',
    example: 45,
    required: false,
  })
  avgTimeToContact?: number;
}

/**
 * Single leaderboard entry
 */
export class LeaderboardEntryDto {
  @ApiProperty({
    description: 'Collector user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  collectorId!: string;

  @ApiProperty({
    description: 'Collector name',
    example: 'Sarah Johnson',
  })
  collectorName!: string;

  @ApiProperty({
    description: 'Total amount collected this period (in cents)',
    example: 24500000,
  })
  totalCollected!: number;

  @ApiProperty({
    description: 'Rank position (1-based)',
    example: 1,
  })
  rank!: number;

  @ApiProperty({
    description: 'Whether this is the current user',
    example: false,
  })
  isCurrentUser!: boolean;

  @ApiProperty({
    description: 'Number of accounts resolved this period',
    example: 34,
    required: false,
  })
  accountsResolved?: number;

  @ApiProperty({
    description: 'Number of total contacts made',
    example: 156,
    required: false,
  })
  totalContacts?: number;
}

/**
 * Team leaderboard response
 */
export class CollectorLeaderboardDto {
  @ApiProperty({
    description: 'Period granularity for the leaderboard',
    example: TrendGranularity.MONTHLY,
    enum: TrendGranularity,
    enumName: 'TrendGranularity',
  })
  period!: TrendGranularity;

  @ApiProperty({
    description: 'Start date of the period',
    example: '2025-12-01T00:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  periodStart!: string;

  @ApiProperty({
    description: 'End date of the period',
    example: '2025-12-31T23:59:59.999Z',
    type: 'string',
    format: 'date-time',
  })
  periodEnd!: string;

  @ApiProperty({
    description: 'Leaderboard entries sorted by rank',
    type: [LeaderboardEntryDto],
  })
  entries!: LeaderboardEntryDto[];

  @ApiProperty({
    description: 'Total number of collectors in the organization',
    example: 15,
    type: 'number',
  })
  totalCollectors!: number;

  @ApiProperty({
    description: 'Current user rank',
    example: 3,
    required: false,
    type: 'number',
  })
  currentUserRank?: number;
}

/**
 * Historical performance point for time-series charts
 */
export class CollectorPerformancePointDto {
  @ApiProperty({ description: 'The date for this metric (YYYY-MM-DD)', example: '2025-12-20' })
  date!: string;

  @ApiProperty({ description: 'Total calls made' })
  callsMade!: number;

  @ApiProperty({ description: 'Total emails sent' })
  emailsSent!: number;

  @ApiProperty({ description: 'Total SMS sent' })
  smsSent!: number;

  @ApiProperty({ description: 'Unique accounts contacted' })
  uniqueAccountsContacted!: number;

  @ApiProperty({ description: 'Promises secured' })
  promisesSecured!: number;

  @ApiProperty({ description: 'Payments received' })
  paymentsReceived!: number;

  @ApiProperty({ description: 'Total collected (in cents)', type: 'string' })
  totalCollected!: string;
}
