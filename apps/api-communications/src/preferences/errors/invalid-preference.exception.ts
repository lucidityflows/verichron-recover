import { BaseException } from "@verichron/error-handling/dist";
import { HttpStatus } from "@nestjs/common";

export class InvalidPreferenceException extends BaseException {
  constructor(field: string, reason: string) {
    super(
      `Invalid preference value for '${field}': ${reason}`,
      HttpStatus.BAD_REQUEST,
      'COMMS_PREF_002'
    );
  }
}
