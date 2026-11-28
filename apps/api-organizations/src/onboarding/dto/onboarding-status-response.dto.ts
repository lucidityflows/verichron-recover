import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { OrganizationStatus } from '@verichron/enums';
import { IOnboardingStatusResponse } from '@verichron/contracts';

/**
 * Onboarding step status
 */
export enum OnboardingStep {
  ORGANIZATION_CREATED = 'ORGANIZATION_CREATED',
  ADMIN_USER_PROVISIONED = 'ADMIN_USER_PROVISIONED',
  DEFAULT_SETTINGS_APPLIED = 'DEFAULT_SETTINGS_APPLIED',
  ORGANIZATION_ACTIVATED = 'ORGANIZATION_ACTIVATED',
  EVENT_PUBLISHED = 'EVENT_PUBLISHED',
}

/**
 * Response DTO for onboarding status
 */
@Exclude()
export class OnboardingStatusResponseDto implements IOnboardingStatusResponse {
  @Expose()
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orgId!: string;

  @Expose()
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Collection Agency',
  })
  orgName!: string;

  @Expose()
  @ApiProperty({
    description: 'Current organization status',
    enum: OrganizationStatus,
    enumName: 'OrganizationStatus',
    example: OrganizationStatus.ACTIVE,
  })
  status!: OrganizationStatus;

  @Expose()
  @ApiProperty({
    description: 'Completed onboarding steps',
    enum: OnboardingStep,
    enumName: 'OnboardingStep',
    isArray: true,
    example: [
      OnboardingStep.ORGANIZATION_CREATED,
      OnboardingStep.ADMIN_USER_PROVISIONED,
      OnboardingStep.DEFAULT_SETTINGS_APPLIED,
      OnboardingStep.ORGANIZATION_ACTIVATED,
      OnboardingStep.EVENT_PUBLISHED,
    ],
  })
  completedSteps!: OnboardingStep[];

  @Expose()
  @ApiProperty({
    description: 'Is onboarding complete',
    example: true,
  })
  isComplete!: boolean;

  @Expose()
  @ApiProperty({
    description: 'When onboarding started',
    example: '2025-10-18T10:00:00.000Z',
  })
  createdAt!: Date;

  @Expose()
  @ApiProperty({
    description: 'When onboarding was last updated',
    example: '2025-10-18T10:05:00.000Z',
  })
  updatedAt!: Date;
}
