import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsObject,
  IsString,
  IsUrl,
  IsHexColor,
  IsBoolean,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  Max,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IOrganizationBrandingSettings,
  IOrganizationComplianceSettings,
  IOrganizationBusinessRulesSettings,
  IOrganizationCommunicationPreferencesSettings,
  IOrganizationIntegrationsSettings,
  IOrganizationSecuritySettings,
  IOrganizationSettings,
} from '@verichron/contracts';
import { CommunicationCadence } from '@verichron/enums';

export class OrganizationBrandingSettingsDto implements IOrganizationBrandingSettings {
  @ApiPropertyOptional({
    description: 'URL of the organization\'s logo',
    example: 'https://cdn.example.com/logo.png',
  })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'Primary color hex code for branding',
    example: '#1E40AF',
  })
  @IsOptional()
  @IsHexColor()
  primaryColorHex?: string;

  @ApiPropertyOptional({
    description: 'Custom domain for the organization',
    example: 'collections.agency.com',
  })
  @IsOptional()
  @IsString()
  customDomain?: string;
}

export class OrganizationComplianceSettingsDto implements IOrganizationComplianceSettings {
  @ApiPropertyOptional({
    description: 'List of states with specific compliance rules enabled',
    example: ['CA', 'NY', 'TX'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stateSpecificRulesEnabled?: string[];

  @ApiPropertyOptional({
    description: 'Whether to record all calls for compliance',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  recordAllCalls?: boolean;

  @ApiPropertyOptional({
    description: 'Enable strict FDCPA compliance mode',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  fdcpaStrictMode?: boolean;
}

export class OrganizationBusinessRulesSettingsDto implements IOrganizationBusinessRulesSettings {
  @ApiPropertyOptional({
    description: 'Minimum percentage for payment plans',
    example: 0.1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minimumPaymentPlanPercentage?: number;

  @ApiPropertyOptional({
    description: 'Maximum duration for payment plans in months',
    example: 24,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxPaymentPlanDurationMonths?: number;

  @ApiPropertyOptional({
    description: 'Automatically approve payment plans under this amount',
    example: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  autoApprovePaymentPlansUnder?: number;

  @ApiPropertyOptional({
    description: 'Default daily liquidation target for the organization',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  liquidationTargetDaily?: number;
}

export class OrganizationCommunicationPreferencesSettingsDto implements IOrganizationCommunicationPreferencesSettings {
  @ApiPropertyOptional({
    description: 'Default communication cadence',
    enum: CommunicationCadence,
    enumName: 'CommunicationCadence',
    example: 'WEEKLY',
  })
  @IsOptional()
  @IsEnum(CommunicationCadence)
  defaultCommunicationCadence?: CommunicationCadence;

  @ApiPropertyOptional({
    description: 'Globally opt out of SMS communications',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  optOutOfSmsGlobally?: boolean;

  @ApiPropertyOptional({
    description: 'Preferred contact time start (HH:mm)',
    example: '09:00',
  })
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  preferredContactTimeStart?: string;

  @ApiPropertyOptional({
    description: 'Preferred contact time end (HH:mm)',
    example: '17:00',
  })
  @IsOptional()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  preferredContactTimeEnd?: string;
}

export class IntegrationConfigDto {
  @ApiPropertyOptional({ description: 'API Key or Secret', example: 'sk_test_...' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Whether the integration is enabled', example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class OrganizationIntegrationsSettingsDto implements IOrganizationIntegrationsSettings {
  @ApiPropertyOptional({ type: IntegrationConfigDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => IntegrationConfigDto)
  stripe?: IntegrationConfigDto;

  @ApiPropertyOptional({ type: IntegrationConfigDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => IntegrationConfigDto)
  twilio?: IntegrationConfigDto;

  @ApiPropertyOptional({ type: IntegrationConfigDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => IntegrationConfigDto)
  sendgrid?: IntegrationConfigDto;
}

export class OrganizationSecuritySettingsDto implements IOrganizationSecuritySettings {
  @ApiPropertyOptional({ description: 'Enforce MFA for all users', example: true })
  @IsOptional()
  @IsBoolean()
  mfaEnforced?: boolean;

  @ApiPropertyOptional({ description: 'Session timeout in minutes', example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(1440)
  sessionTimeoutMinutes?: number;

  @ApiPropertyOptional({ description: 'Password expiry in days', example: 90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  passwordExpiryDays?: number;
}

export class OrganizationSettingsDto implements IOrganizationSettings {
  @ApiPropertyOptional({ type: OrganizationBrandingSettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OrganizationBrandingSettingsDto)
  branding?: OrganizationBrandingSettingsDto;

  @ApiPropertyOptional({ type: OrganizationComplianceSettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OrganizationComplianceSettingsDto)
  compliance?: OrganizationComplianceSettingsDto;

  @ApiPropertyOptional({ type: OrganizationBusinessRulesSettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OrganizationBusinessRulesSettingsDto)
  businessRules?: OrganizationBusinessRulesSettingsDto;

  @ApiPropertyOptional({ type: OrganizationCommunicationPreferencesSettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OrganizationCommunicationPreferencesSettingsDto)
  communicationPreferences?: OrganizationCommunicationPreferencesSettingsDto;

  @ApiPropertyOptional({ type: OrganizationIntegrationsSettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OrganizationIntegrationsSettingsDto)
  integrations?: OrganizationIntegrationsSettingsDto;

  @ApiPropertyOptional({ type: OrganizationSecuritySettingsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => OrganizationSecuritySettingsDto)
  security?: OrganizationSecuritySettingsDto;
}
