import { BaseException } from "@verichron/error-handling/dist";
import { HttpStatus } from "@nestjs/common";

export class LogUpdateFailedException extends BaseException {
  constructor(logId: string, reason: string) {
    super(
      `Failed to update log '${logId}': ${reason}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'COMMS_LOG_002'
    );
  }
}