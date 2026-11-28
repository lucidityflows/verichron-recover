import { BaseException } from "@verichron/error-handling/dist";
import { HttpStatus } from "@nestjs/common";

export class LogNotFoundException extends BaseException {
  constructor(logId: string) {
    super(
      `Communication log with ID '${logId}' not found`,
      HttpStatus.NOT_FOUND,
      'COMMS_LOG_001'
    );
  }
}