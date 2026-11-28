import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO after dispatching a communication
 *
 * Returns the communication log ID and initial status.
 * Clients should poll the log or subscribe to events for status updates.
 */
export class DispatchResponseDto {
  @ApiProperty({
    description: 'Communication log ID (MongoDB ObjectId)',
    example: '507f1f77bcf86cd799439011',
  })
  logId: string;

  @ApiProperty({
    description: 'Initial dispatch status',
    example: 'SENDING',
    enum: ['SENDING', 'BLOCKED'],
  })
  status: 'SENDING' | 'BLOCKED';

  @ApiProperty({
    description: 'Gateway provider used',
    example: 'sendgrid',
  })
  provider: string;

  @ApiProperty({
    description: 'Gateway-provided message ID (if available)',
    example: 'sg-msg-abc123xyz',
    nullable: true,
  })
  providerMessageId?: string;

  @ApiProperty({
    description: 'Reason for blocking (if status is BLOCKED)',
    example: 'Debtor opted out of EMAIL',
    nullable: true,
  })
  blockedReason?: string;

  @ApiProperty({
    description: 'Timestamp when dispatch was initiated',
    example: '2024-01-15T10:30:00Z',
  })
  dispatchedAt: string;
}
