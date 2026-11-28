import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class InvalidOrganizationTypeException extends BaseException {
  constructor(organizationType: string) {
    super(
      `Invalid organization type '${organizationType}'. Must be AGENCY, CREDITOR, or PARTNER.`,
      HttpStatus.BAD_REQUEST,
      'ORGS_ONBOARDING_004'
    );
  }
}
