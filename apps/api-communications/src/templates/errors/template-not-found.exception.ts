import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class TemplateNotFoundException extends BaseException {
  constructor(identifier: string) {
    super(
      `Template '${identifier}' not found`,
      HttpStatus.NOT_FOUND,
      'COMMS_TEMPLATE_001'
    );
  }
}
