import { ApiProperty } from '@nestjs/swagger';
import { IDebtorEmail } from '@verichron/contracts';
import { EmailCategory, EmailBounceStatus } from '@verichron/enums'; // Added EmailBounceStatus

export class EmailDto implements IDebtorEmail {
  @ApiProperty({ description: 'Unique email record identifier', example: '123e4567-e89b-12d3-a456-426614174002' })
  id: string;

  @ApiProperty({ description: 'Debtor Profile ID this email belongs to', example: '123e4567-e89b-12d3-a456-426614174000' })
  debtorProfileId: string;

  @ApiProperty({ description: 'Email address', example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({
    description: 'Email type/category',
    enum: EmailCategory,
    enumName: 'EmailCategory',
    example: EmailCategory.GENERAL,
  })
  emailCategory: EmailCategory;

  @ApiProperty({ description: 'Flag indicating if this is the primary email', example: true })
  isPrimary: boolean;

  @ApiProperty({ description: 'Flag indicating if email has been verified', example: true })
  isVerified: boolean;

  @ApiProperty({ description: 'Timestamp of last email verification', example: '2024-01-15T10:30:00Z', nullable: true })
  verifiedAt?: Date;

  @ApiProperty({ // Updated to use EmailBounceStatus enum
    description: 'Email deliverability status',
    enum: EmailBounceStatus,
    enumName: 'EmailBounceStatus',
    example: EmailBounceStatus.VALID,
  })
  bounceStatus: EmailBounceStatus;

  @ApiProperty({ description: 'Timestamp of last bounce event', example: '2024-01-15T10:30:00Z', nullable: true })
  lastBouncedAt?: Date;

  @ApiProperty({ description: 'Timestamp when email was created', example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when email was last updated', example: '2021-01-15T10:30:00Z' })
  updatedAt: Date;
}
