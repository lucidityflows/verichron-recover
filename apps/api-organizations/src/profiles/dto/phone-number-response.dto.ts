import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { BaseResponseDto } from '../../core/dto/base-response.dto';
import { PhoneCategory } from '@verichron/enums';
import { IOrganizationPhoneNumberResponse } from '@verichron/contracts';

/**
 * Response DTO for organization phone number data
 */
@Exclude()
export class PhoneNumberResponseDto extends BaseResponseDto implements IOrganizationPhoneNumberResponse {
  @Expose()
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId!: string;

  @Expose()
  @ApiProperty({
    description: 'Phone number',
    example: '+1-555-123-4567',
  })
  phoneNumber!: string;

  @Expose()
  @ApiProperty({
    description: 'Phone extension',
    example: '1234',
    required: false,
  })
  extension?: string;

  @Expose()
  @ApiProperty({
    description: 'Is this the primary phone number for the organization',
    example: true,
  })
  isPrimary!: boolean;

  @Expose()
  @ApiProperty({
    description: 'Is this phone number verified',
    example: true,
  })
  isVerified!: boolean;

  @Expose()
  @ApiProperty({
    description: 'Phone number category/type',
    enum: PhoneCategory,
    enumName: 'PhoneCategory',
    example: PhoneCategory.BUSINESS,
  })
  category!: PhoneCategory;

  @Expose()
  @ApiProperty({
    description: 'Date from which this phone number is valid',
    example: '2025-01-01T00:00:00.000Z',
    required: false,
  })
  validFrom?: Date;

  @Expose()
  @ApiProperty({
    description: 'Date until which this phone number is valid',
    example: '2026-12-31T23:59:59.999Z',
    required: false,
  })
  validTo?: Date;
}
