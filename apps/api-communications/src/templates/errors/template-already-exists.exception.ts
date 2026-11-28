import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class TemplateAlreadyExistsException extends BaseException {
  constructor(name: string, organizationId: string) {
    super(
      `Template '${name}' already exists for organization '${organizationId}'`,
      HttpStatus.CONFLICT,
      'COMMS_TEMPLATE_004'
    );
  }
}

