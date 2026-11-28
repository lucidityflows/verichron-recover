import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new creditor record.
 *
 * Typically used by:
 * - Manual creditor entry by admins
 * - Platform admin creating global creditors (Gold List)
 *
 * Notes:
 * - organizationId is extracted from JWT via @OrganizationId() decorator
 * - normalizedName is calculated automatically from legalName
 * - id, createdAt, updatedAt are auto-generated
 */
export class CreateCreditorDto {
  @ApiProperty({
    description: 'Legal name of the creditor',
    example: 'JPMorgan Chase N.A.',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'legalName is required' })
  @MaxLength(255, { message: 'legalName must not exceed 255 characters' })
  legalName: string;

  @ApiPropertyOptional({
    description: 'Employer Identification Number (EIN) - format: XX-XXXXXXX',
    example: '13-2890427',
    maxLength: 10,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10, { message: 'EIN must not exceed 10 characters' })
  @Matches(/^\d{2}-\d{7}$/, { message: 'EIN must be in format XX-XXXXXXX' })
  ein?: string;

  @ApiPropertyOptional({
    description: 'Doing Business As (DBA) name if different from legal name',
    example: 'Chase Bank',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'dbaName must not exceed 255 characters' })
  dbaName?: string;

  @ApiPropertyOptional({
    description: 'Primary street address line 1',
    example: '270 Park Avenue',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  street1?: string;

  @ApiPropertyOptional({
    description: 'Street address line 2 (suite, floor, etc.)',
    example: 'Floor 12',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  street2?: string;

  @ApiPropertyOptional({
    description: 'Street address line 3',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  street3?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'New York',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    description: 'State (2-letter code)',
    example: 'NY',
    maxLength: 2,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  @Matches(/^[A-Z]{2}$/, { message: 'state must be a 2-letter uppercase code' })
  state?: string;

  @ApiPropertyOptional({
    description: 'Postal code (5 or 9 digit ZIP code)',
    example: '10017',
    maxLength: 10,
  })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional({
    description: 'Country (ISO 3166-1 alpha-2 code)',
    example: 'US',
    maxLength: 2,
    default: 'US',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2)
  @Matches(/^[A-Z]{2}$/, { message: 'country must be a 2-letter uppercase code' })
  country?: string;

  @ApiPropertyOptional({
    description: 'Industry classification',
    example: 'Banking',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    description: 'Notes about this creditor',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
