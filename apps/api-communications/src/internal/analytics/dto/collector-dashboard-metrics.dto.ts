import { ApiProperty } from '@nestjs/swagger';

/**
 * Collector Dashboard Communication Metrics DTO
 *
 * Comprehensive communication metrics for a collector's dashboard.
 * Includes both the requested period stats AND today's stats in a single response.
 */
export class CollectorDashboardMetricsDto {
  @ApiProperty({
    description: 'Collector user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  collectorUserId!: string;

  @ApiProperty({
    description: 'Start of the requested reporting period',
    example: '2025-01-01T00:00:00.000Z',
  })
  periodStart!: string;

  @ApiProperty({
    description: 'End of the requested reporting period',
    example: '2025-01-31T23:59:59.999Z',
  })
  periodEnd!: string;

  // Period metrics (for the requested date range)
  @ApiProperty({
    description: 'Total phone calls made in the period',
    example: 187,
  })
  totalCalls!: number;

  @ApiProperty({
    description: 'Total emails sent in the period',
    example: 95,
  })
  totalEmails!: number;

  @ApiProperty({
    description: 'Total SMS messages sent in the period',
    example: 42,
  })
  totalSms!: number;

  @ApiProperty({
    description: 'Number of unique debtor accounts contacted in the period',
    example: 85,
  })
  uniqueAccountsContacted!: number;

  @ApiProperty({
    description: 'Email response rate (percentage of emails opened) in the period',
    example: 78.3,
  })
  emailResponseRate!: number;

  @ApiProperty({
    description: 'Number of emails delivered in the period',
    example: 88,
  })
  emailsDelivered!: number;

  @ApiProperty({
    description: 'Number of emails opened in the period',
    example: 69,
  })
  emailsOpened!: number;

  // Today's metrics (always for current day regardless of period requested)
  @ApiProperty({
    description: 'Total phone calls made today',
    example: 15,
  })
  totalCallsToday!: number;

  @ApiProperty({
    description: 'Total emails sent today',
    example: 8,
  })
  totalEmailsToday!: number;

  @ApiProperty({
    description: 'Total SMS messages sent today',
    example: 3,
  })
  totalSmsToday!: number;

  @ApiProperty({
    description: 'Number of unique debtor accounts contacted today',
    example: 12,
  })
  uniqueAccountsContactedToday!: number;

  @ApiProperty({
    description: 'Email response rate (percentage of emails opened) today',
    example: 62.5,
  })
  emailResponseRateToday!: number;
}
