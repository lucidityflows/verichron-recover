import { BaseException } from "@verichron/error-handling/dist";
import { HttpStatus } from "@nestjs/common";

export class TimeRestrictionViolationException extends BaseException {
  constructor(currentHour: number, allowedRange: string, nextAllowedAt: Date) {
    super(
      `Contact not allowed at hour ${currentHour}. Allowed: ${allowedRange}`,
      HttpStatus.FORBIDDEN,
      'COMMS_COMPLIANCE_003'
    );
  }
}
