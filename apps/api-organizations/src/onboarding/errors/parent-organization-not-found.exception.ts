import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';


export class ParentOrganizationNotFoundException extends BaseException {
  constructor(parentOrganizationId: string) {
    super(
      `Parent organization with ID '${parentOrganizationId}' not found.`,
      HttpStatus.NOT_FOUND,
      'ORGS_ONBOARDING_002'
    );
  }
}