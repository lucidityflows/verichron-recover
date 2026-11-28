import { ApiProperty } from '@nestjs/swagger';
import { IDebtorPhone } from '@verichron/contracts';
import { PhoneCategory } from '@verichron/enums';

export class PhoneDto implements IDebtorPhone {
  @ApiProperty({ description: 'Unique phone record identifier', example: '123e4567-e89b-12d3-a456-426614174003' })
  id: string;

  @ApiProperty({ description: 'Debtor Profile ID this phone belongs to', example: '123e4567-e89b-12d3-a456-426614174000' })
  debtorProfileId: string;

  @ApiProperty({ description: 'Phone number (formatted)', example: '+1-555-123-4567' })
  phoneNumber: string;

  @ApiProperty({
    description: 'Phone type/category',
    enum: PhoneCategory,
    enumName: 'PhoneCategory',
    example: PhoneCategory.MOBILE,
  })
  category: PhoneCategory;

  @ApiProperty({ description: 'Flag indicating if this is the primary phone number', example: true })
  isPrimary: boolean;

  @ApiProperty({ description: 'Flag indicating if phone has been verified', example: true })
  isVerified: boolean;

  @ApiProperty({ description: 'Timestamp of last phone verification', example: '2024-01-15T10:30:00Z', nullable: true })
  verifiedAt?: Date;

  @ApiProperty({ description: 'Flag indicating if phone can receive SMS', example: true })
  canReceiveSms: boolean;

  @ApiProperty({ description: 'Flag indicating if phone can receive calls', example: true })
  canReceiveCalls: boolean;

  @ApiProperty({ description: 'Flag indicating if debtor opted out of communications on this number', example: false })
  isOptedOut: boolean;

  @ApiProperty({ description: 'Timestamp when debtor opted out', example: '2024-01-15T10:30:00Z', nullable: true })
  optedOutAt?: Date;

  @ApiProperty({ description: 'Timestamp when phone was created', example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when phone was last updated', example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}
