import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsUUID, Length, Matches } from 'class-validator';
import { Exclude, Expose } from 'class-transformer';
import { OrganizationType } from '@verichron/enums';
import { IOrganizationBase } from '@verichron/contracts';

/**
 * Base DTO for organization with shared fields
 */
@Exclude()
export class OrganizationBaseDto implements IOrganizationBase {
  @ApiProperty({
    description: 'Organization legal name',
    example: 'Acme Collection Agency',
    minLength: 2,
    maxLength: 255,
  })
  @Expose()
  @IsString()
  @Length(2, 255)
  @Matches(/^[a-zA-Z0-9\s'-]+$/, {
    message: 'Organization name can only contain alphanumeric characters, spaces, hyphens, and apostrophes',
  })
  name!: string;

  @ApiProperty({
    description: 'Organization display/brand name',
    example: 'Acme Collections',
    required: false,
    minLength: 1,
    maxLength: 255,
  })
  @Expose()
  @IsOptional()
  @IsString()
  @Length(1, 255)
  displayName?: string;

  @ApiProperty({
    description: 'Organization type classification',
    enum: OrganizationType,
    enumName: 'OrganizationType',
    example: OrganizationType.COLLECTION_AGENCY,
  })
  @Expose()
  @IsEnum(OrganizationType)
  organizationType!: OrganizationType;

  @ApiProperty({
    description: 'Parent organization ID for hierarchy',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @Expose()
  @IsOptional()
  @IsUUID()
  parentOrganizationId?: string;

  @ApiProperty({
    description: 'Tax ID / EIN',
    example: '12-3456789',
    required: false,
    minLength: 1,
    maxLength: 50,
  })
  @Expose()
  @IsOptional()
  @IsString()
  @Length(1, 50)
  taxId?: string;
}
