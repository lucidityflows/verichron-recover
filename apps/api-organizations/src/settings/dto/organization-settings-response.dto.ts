import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { IOrganizationSettingsResponse } from '@verichron/contracts';

/**
 * Response DTO for organization settings (JSONB)
 */
@Exclude()
export class OrganizationSettingsResponseDto implements IOrganizationSettingsResponse {
  @Expose()
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orgId!: string;

  @Expose()
  @ApiProperty({
    description: 'Organization settings (JSONB)',
    example: {
      branding: {
        logo_url: 'https://cdn.example.com/logo.png',
        primary_color_hex: '#1E40AF',
        custom_domain: 'collections.agency.com',
      },
      compliance: {
        state_specific_rules_enabled: ['CA', 'NY', 'TX'],
        record_all_calls: true,
        fdcpa_strict_mode: true,
      },
      business_rules: {
        minimum_payment_plan_percentage: 0.10,
        max_payment_plan_duration_months: 24,
        auto_approve_payment_plans_under: 1000,
      },
      communication_preferences: {
        default_communication_cadence: 'WEEKLY',
        opt_out_of_sms_globally: false,
        preferred_contact_time_start: '09:00',
        preferred_contact_time_end: '17:00',
      },
    },
    type: 'object',
    additionalProperties: true,
  })
  settings!: Record<string, any>;

  @Expose()
  @ApiProperty({
    description: 'ID of the user who last updated the settings',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    nullable: true,
  })
  updatedBy!: string | null;

  @Expose()
  @ApiProperty({
    description: 'When settings were last updated',
    example: '2025-10-18T14:30:00.000Z',
  })
  updatedAt!: Date;
}
