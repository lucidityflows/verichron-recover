import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsEnum, IsEmail, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { EmailCategory } from '@verichron/enums';
import { IOrganizationEmailCreate } from '@verichron/contracts';

/**
 * DTO for creating a new organization email
 */
export class CreateEmailDto implements IOrganizationEmailCreate {
  @ApiProperty({
    description: 'Email address',
    example: 'contact@acme-collections.com',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    description: 'Is this the primary email for the organization',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({
    description: 'Is this email verified',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @ApiProperty({
    description: 'Email category/purpose',
    enum: EmailCategory,
    enumName: 'EmailCategory',
    example: EmailCategory.GENERAL,
    default: EmailCategory.GENERAL,
  })
  @IsOptional()
  @IsEnum(EmailCategory)
  emailCategory?: EmailCategory;

  @ApiProperty({
    description: 'Date from which this email is valid',
    example: '2025-01-01T00:00:00.000Z',
    required: false,
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validFrom?: Date;

  @ApiProperty({
    description: 'Date until which this email is valid',
    example: '2026-12-31T23:59:59.999Z',
    required: false,
    type: 'string',
    format: 'date-time',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validTo?: Date;
}
