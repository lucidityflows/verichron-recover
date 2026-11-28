import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';
import { Expose } from 'class-transformer';
import { OrganizationBaseDto } from './organization-base.dto';
import { ICreateOrganization } from '@verichron/contracts';

/**
 * DTO for creating a new organization
 */
export class CreateOrganizationDto extends OrganizationBaseDto implements ICreateOrganization {
  @ApiProperty({
    description: 'Initial organization settings (JSONB)',
    example: {
      branding: {
        logo_url: 'https://cdn.example.com/logo.png',
        primary_color_hex: '#1E40AF',
      },
      compliance: {
        fdcpa_strict_mode: true,
        record_all_calls: true,
      },
    },
    required: false,
  })
  @Expose()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
