import { ApiProperty } from '@nestjs/swagger';
import {
  DebtorProfileStatus,
  AddressCategory,
  EmailCategory,
  PhoneCategory,
} from '@verichron/enums';

/**
 * Address information for debtor focus view
 */
export class DebtorFocusAddressDto {
  @ApiProperty({
    description: 'Address ID',
    example: 'address-123',
  })
  addressId: string;

  @ApiProperty({
    description: 'Address category',
    enum: AddressCategory,
    example: AddressCategory.RESIDENCE_PRIMARY,
  })
  category: AddressCategory;

  @ApiProperty({
    description: 'Street address line 1',
    example: '123 Main Street',
  })
  street1: string;

  @ApiProperty({
    description: 'Street address line 2',
    example: 'Apt 4B',
    nullable: true,
  })
  street2: string | null;

  @ApiProperty({
    description: 'City',
    example: 'Springfield',
  })
  city: string;

  @ApiProperty({
    description: 'State code',
    example: 'IL',
  })
  state: string;

  @ApiProperty({
    description: 'Postal code',
    example: '62701',
  })
  postalCode: string;

  @ApiProperty({
    description: 'Whether this is the primary address',
    example: true,
  })
  isPrimary: boolean;
}

/**
 * Email information for debtor focus view
 */
export class DebtorFocusEmailDto {
  @ApiProperty({
    description: 'Email record ID',
    example: 'email-123',
  })
  emailId: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Email category',
    enum: EmailCategory,
    example: EmailCategory.GENERAL,
  })
  category: EmailCategory;

  @ApiProperty({
    description: 'Whether this is the primary email',
    example: true,
  })
  isPrimary: boolean;

  @ApiProperty({
    description: 'Whether email is verified',
    example: true,
  })
  isVerified: boolean;
}

/**
 * Phone information for debtor focus view
 */
export class DebtorFocusPhoneDto {
  @ApiProperty({
    description: 'Phone record ID',
    example: 'phone-123',
  })
  phoneId: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1-555-123-4567',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Phone category',
    enum: PhoneCategory,
    example: PhoneCategory.MOBILE,
  })
  category: PhoneCategory;

  @ApiProperty({
    description: 'Whether this is the primary phone',
    example: true,
  })
  isPrimary: boolean;

  @ApiProperty({
    description: 'Whether phone is verified',
    example: true,
  })
  isVerified: boolean;
}

/**
 * Response DTO for debtor focus profile endpoint
 */
export class DebtorFocusProfileResponseDto {
  @ApiProperty({
    description: 'Debtor profile ID',
    example: 'profile-123',
  })
  debtorProfileId: string;

  @ApiProperty({
    description: 'Debtor identity ID (global identifier)',
    example: 'identity-456',
  })
  debtorIdentityId: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Middle name',
    example: 'Michael',
    nullable: true,
  })
  middleName: string | null;

  @ApiProperty({
    description: 'Date of birth',
    example: '1985-06-15',
    nullable: true,
  })
  dateOfBirth: string | null;

  @ApiProperty({
    description: 'Profile status',
    enum: DebtorProfileStatus,
    example: DebtorProfileStatus.ACTIVE,
  })
  status: DebtorProfileStatus;

  @ApiProperty({
    description: 'Date profile was created',
    example: '2024-01-15',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Date profile was last updated',
    example: '2024-11-20',
  })
  updatedAt: string;

  @ApiProperty({
    description: 'All addresses for this debtor',
    type: [DebtorFocusAddressDto],
  })
  addresses: DebtorFocusAddressDto[];

  @ApiProperty({
    description: 'All email addresses for this debtor',
    type: [DebtorFocusEmailDto],
  })
  emails: DebtorFocusEmailDto[];

  @ApiProperty({
    description: 'All phone numbers for this debtor',
    type: [DebtorFocusPhoneDto],
  })
  phones: DebtorFocusPhoneDto[];
}
