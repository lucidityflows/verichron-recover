import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class TemplateRenderFailedException extends BaseException {
  constructor(message: string, templateId?: string) {
    super(
      `Template rendering failed: ${message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'COMMS_TEMPLATE_002'
    );
  }
}