import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class OrganizationAlreadyExistsException extends BaseException {
  constructor(organizationName: string) {
    super(
      `Organization with name '${organizationName}' already exists.`,
      HttpStatus.CONFLICT,
      'ORGS_ONBOARDING_001'
    );
  }
}
