import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class AuditContextMissingException extends BaseException {
  constructor() {
    super(
      'User context missing for audit log generation.',
      HttpStatus.INTERNAL_SERVER_ERROR,
      'ORGS_AUDIT_001'
    );
  }
}
