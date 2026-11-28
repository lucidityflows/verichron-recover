import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { EmailCategory } from '@verichron/enums';
import { IOrganizationEmailResponse } from '@verichron/contracts';
import { BaseResponseDto } from '../../core/dto/base-response.dto';

/**
 * Response DTO for organization email data
 */
@Exclude()
export class EmailResponseDto extends BaseResponseDto implements IOrganizationEmailResponse {
  @Expose()
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId!: string;

  @Expose()
  @ApiProperty({
    description: 'Email address',
    example: 'contact@acme-collections.com',
  })
  email!: string;

  @Expose()
  @ApiProperty({
    description: 'Is this the primary email for the organization',
    example: true,
  })
  isPrimary!: boolean;

  @Expose()
  @ApiProperty({
    description: 'Is this email verified',
    example: true,
  })
  isVerified!: boolean;

  @Expose()
  @ApiProperty({
    description: 'Email category/purpose',
    enum: EmailCategory,
    enumName: 'EmailCategory',
    example: EmailCategory.GENERAL,
  })
  emailCategory!: EmailCategory;

  @Expose()
  @ApiProperty({
    description: 'Date from which this email is valid',
    example: '2025-01-01T00:00:00.000Z',
    required: false,
  })
  validFrom?: Date;

  @Expose()
  @ApiProperty({
    description: 'Date until which this email is valid',
    example: '2026-12-31T23:59:59.999Z',
    required: false,
  })
  validTo?: Date;
}
