import { ApiProperty } from '@nestjs/swagger';
import { CommunicationType, CommunicationStatus } from '@verichron/enums';

/**
 * Individual communication record for debtor focus view
 */
export class DebtorFocusCommunicationDto {
  @ApiProperty({
    description: 'Communication log ID',
    example: '507f1f77bcf86cd799439011',
  })
  communicationId: string;

  @ApiProperty({
    description: 'Communication type',
    enum: CommunicationType,
    example: CommunicationType.EMAIL,
  })
  type: CommunicationType;

  @ApiProperty({
    description: 'Current status',
    enum: CommunicationStatus,
    example: CommunicationStatus.DELIVERED,
  })
  status: CommunicationStatus;

  @ApiProperty({
    description: 'Debt ID if communication is debt-specific',
    example: 'debt-456',
    nullable: true,
  })
  debtId: string | null;

  @ApiProperty({
    description: 'Template name used',
    example: 'payment-receipt',
    nullable: true,
  })
  templateName: string | null;

  @ApiProperty({
    description: 'Subject line (for emails)',
    example: 'Payment Receipt - $100.00',
    nullable: true,
  })
  subject: string | null;

  @ApiProperty({
    description: 'Gateway provider used',
    example: 'sendgrid',
    nullable: true,
  })
  provider: string | null;

  @ApiProperty({
    description: 'Timestamp when sent',
    example: '2024-11-15T10:30:00Z',
    nullable: true,
  })
  sentAt: string | null;

  @ApiProperty({
    description: 'Timestamp when delivered',
    example: '2024-11-15T10:31:00Z',
    nullable: true,
  })
  deliveredAt: string | null;

  @ApiProperty({
    description: 'Timestamp when opened (emails only)',
    example: '2024-11-15T11:00:00Z',
    nullable: true,
  })
  openedAt: string | null;

  @ApiProperty({
    description: 'Reason for failure if status is FAILED',
    example: 'Invalid email address',
    nullable: true,
  })
  failureReason: string | null;

  @ApiProperty({
    description: 'Reason for blocking if status is BLOCKED',
    example: 'Time restriction: Outside allowed hours',
    nullable: true,
  })
  blockedReason: string | null;

  @ApiProperty({
    description: 'Communication created timestamp',
    example: '2024-11-15T10:30:00Z',
  })
  createdAt: string;
}

/**
 * Response DTO for debtor focus communications endpoint
 */
export class DebtorFocusCommunicationsResponseDto {
  @ApiProperty({
    description: 'List of communications for this debtor',
    type: [DebtorFocusCommunicationDto],
  })
  communications: DebtorFocusCommunicationDto[];

  @ApiProperty({
    description: 'Total number of communications sent',
    example: 45,
  })
  totalCommunications: number;

  @ApiProperty({
    description: 'Number of emails sent',
    example: 30,
  })
  emailCount: number;

  @ApiProperty({
    description: 'Number of SMS messages sent',
    example: 15,
  })
  smsCount: number;

  @ApiProperty({
    description: 'Number of letters sent',
    example: 0,
  })
  letterCount: number;

  @ApiProperty({
    description: 'Number of delivered communications',
    example: 40,
  })
  deliveredCount: number;

  @ApiProperty({
    description: 'Number of failed communications',
    example: 2,
  })
  failedCount: number;

  @ApiProperty({
    description: 'Number of opened emails',
    example: 25,
  })
  openedCount: number;

  @ApiProperty({
    description: 'Date of last communication',
    example: '2024-11-15',
    nullable: true,
  })
  lastCommunicationDate: string | null;

  @ApiProperty({
    description: 'Type of last communication',
    example: 'EMAIL',
    nullable: true,
  })
  lastCommunicationType: string | null;
}
