import { BaseException } from '@verichron/error-handling';
import { HttpStatus } from '@nestjs/common';

export class InvalidTemplateSyntaxException extends BaseException {
  constructor(errors: string[]) {
    super(
      `Template syntax validation failed`,
      HttpStatus.BAD_REQUEST,
      'COMMS_TEMPLATE_003'
    );
  }
}