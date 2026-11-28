import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to create an organization that already exists
 */
export class OrganizationAlreadyExistsException extends BaseException {
  constructor(identifier?: string) {
    const message = identifier
      ? `Organization with name '${identifier}' already exists.`
      : 'Organization already exists';
    super(message, HttpStatus.CONFLICT, 'ORGS_PROFILE_002');
  }
}
