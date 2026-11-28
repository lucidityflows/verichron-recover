import { ApiProperty } from '@nestjs/swagger';
import { IDebtorAddress } from '@verichron/contracts';
import { AddressCategory } from '@verichron/enums';

export class AddressDto implements IDebtorAddress {
  @ApiProperty({ description: 'Unique address identifier', example: '123e4567-e89b-12d3-a456-426614174001' })
  id: string;

  @ApiProperty({ description: 'Debtor Profile ID this address belongs to', example: '123e4567-e89b-12d3-a456-426614174000' })
  debtorProfileId: string;

  @ApiProperty({
    description: 'Address category/type',
    enum: AddressCategory,
    enumName: 'AddressCategory',
    example: AddressCategory.RESIDENCE_PRIMARY,
  })
  addressCategory: AddressCategory;

  @ApiProperty({ description: 'Street address line 1', example: '123 Main Street' })
  street1: string;

  @ApiProperty({ description: 'Street address line 2 (apartment, suite, etc.)', example: 'Apt 4B', nullable: true })
  street2?: string;

  @ApiProperty({ description: 'Street address line 3', nullable: true })
  street3?: string;

  @ApiProperty({ description: 'City name', example: 'Springfield' })
  city: string;

  @ApiProperty({ description: 'State or province code', example: 'IL' })
  state: string;

  @ApiProperty({ description: 'Postal/ZIP code', example: '62701' })
  postalCode: string;

  @ApiProperty({ description: 'Country name', example: 'US' })
  country: string;

  @ApiProperty({ description: 'Latitude coordinate', example: 39.7817213, nullable: true }) // Added
  latitude?: number;

  @ApiProperty({ description: 'Longitude coordinate', example: -89.6501481, nullable: true }) // Added
  longitude?: number;

  @ApiProperty({ description: 'Flag indicating if address has been verified', example: true })
  isVerified: boolean;

  @ApiProperty({ description: 'Timestamp of last address verification', example: '2024-01-15T10:30:00Z', nullable: true })
  verifiedAt?: Date;

  @ApiProperty({ description: 'Flag indicating if this is the current/active address', example: true })
  isCurrent: boolean;

  @ApiProperty({ description: 'Flag indicating if this is the primary address for the debtor', example: true })
  isPrimary: boolean;

  @ApiProperty({ description: 'Timestamp when address was created', example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Timestamp when address was last updated', example: '2024-01-15T10:30:00Z' })
  updatedAt: Date;
}
