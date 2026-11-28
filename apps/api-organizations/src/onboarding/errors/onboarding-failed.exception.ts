import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class OnboardingFailedException extends BaseException {
  constructor(organizationName: string, reason: string) {
    super(
      `Failed to onboard organization '${organizationName}': ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ORGS_ONBOARDING_003'
    );
  }
}