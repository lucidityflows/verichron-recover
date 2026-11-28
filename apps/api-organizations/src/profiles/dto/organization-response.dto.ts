import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { BaseResponseDto } from '../../core/dto/base-response.dto';
import { OrganizationType, OrganizationStatus } from '@verichron/enums';
import { IOrganizationResponse } from '@verichron/contracts';

/**
 * Response DTO for organization data
 */
@Exclude()
export class OrganizationResponseDto extends BaseResponseDto implements IOrganizationResponse {
  @Expose()
  @ApiProperty({
    description: 'Organization legal name',
    example: 'Acme Collection Agency',
  })
  name!: string;

  @Expose()
  @ApiProperty({
    description: 'Organization display/brand name',
    example: 'Acme Collections',
    required: false,
  })
  displayName?: string;

  @Expose()
  @ApiProperty({
    description: 'Organization type classification',
    enum: OrganizationType,
    enumName: 'OrganizationType',
    example: OrganizationType.COLLECTION_AGENCY,
  })
  organizationType!: OrganizationType;

  @Expose()
  @ApiProperty({
    description: 'Parent organization ID for hierarchy',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  parentOrganizationId?: string;

  @Expose()
  @ApiProperty({
    description: 'Tax ID / EIN (sanitized in errors)',
    example: '12-3456789',
    required: false,
  })
  taxId?: string;

  @Expose()
  @ApiProperty({
    description: 'Organization lifecycle status',
    enum: OrganizationStatus,
    enumName: 'OrganizationStatus',
    example: OrganizationStatus.ACTIVE,
  })
  status!: OrganizationStatus;

  @Expose()
  @ApiProperty({
    description: 'Organization settings (JSONB)',
    example: {
      branding: {
        logo_url: 'https://cdn.example.com/logo.png',
        primary_color_hex: '#1E40AF',
      },
    },
    required: false,
  })
  settings?: Record<string, any>;
}
