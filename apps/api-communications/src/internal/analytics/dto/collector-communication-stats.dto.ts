import { ApiProperty } from '@nestjs/swagger';

/**
 * Collector Communication Statistics DTO
 *
 * Aggregated communication metrics for a collector within a time period.
 * Used by api-collectors to calculate performance dashboards and leaderboards.
 */
export class CollectorCommunicationStatsDto {
  @ApiProperty({
    description: 'Collector user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  collectorUserId!: string;

  @ApiProperty({
    description: 'Total phone calls made',
    example: 45,
  })
  totalCalls!: number;

  @ApiProperty({
    description: 'Total emails sent',
    example: 23,
  })
  totalEmails!: number;

  @ApiProperty({
    description: 'Total SMS messages sent',
    example: 12,
  })
  totalSms!: number;

  @ApiProperty({
    description: 'Number of unique debtor accounts contacted',
    example: 38,
  })
  uniqueAccountsContacted!: number;

  @ApiProperty({
    description: 'Email response rate (percentage of emails opened)',
    example: 78.3,
  })
  emailResponseRate!: number;

  @ApiProperty({
    description: 'Number of emails delivered',
    example: 21,
  })
  emailsDelivered!: number;

  @ApiProperty({
    description: 'Number of emails opened',
    example: 18,
  })
  emailsOpened!: number;

  @ApiProperty({
    description: 'Start of the reporting period',
    example: '2025-01-01T00:00:00.000Z',
  })
  periodStart!: string;

  @ApiProperty({
    description: 'End of the reporting period',
    example: '2025-01-31T23:59:59.999Z',
  })
  periodEnd!: string;
}

/**
 * Organization Communication Statistics DTO
 *
 * Aggregated communication metrics for all collectors in an organization.
 * Used for leaderboard calculations.
 */
export class OrganizationCommunicationStatsDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId!: string;

  @ApiProperty({
    description: 'Communication statistics per collector',
    type: [CollectorCommunicationStatsDto],
  })
  collectorStats!: CollectorCommunicationStatsDto[];

  @ApiProperty({
    description: 'Start of the reporting period',
    example: '2025-01-01T00:00:00.000Z',
  })
  periodStart!: string;

  @ApiProperty({
    description: 'End of the reporting period',
    example: '2025-01-31T23:59:59.999Z',
  })
  periodEnd!: string;
}
