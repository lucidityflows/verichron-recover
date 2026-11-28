import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when an organization is not found
 */
export class OrganizationNotFoundException extends BaseException {
  constructor(orgId?: string) {
    const message = orgId
      ? `Organization with ID '${orgId}' not found.`
      : 'Organization not found';
    super(message, HttpStatus.NOT_FOUND, 'ORGS_PROFILE_001');
  }
}
