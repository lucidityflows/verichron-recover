import { BadRequestException } from '@nestjs/common';

export class InvalidSettingsException extends BadRequestException {
  constructor(errors: any) {
    super({
      statusCode: 400,
      message: 'Invalid settings provided',
      errors,
    });
  }
}
