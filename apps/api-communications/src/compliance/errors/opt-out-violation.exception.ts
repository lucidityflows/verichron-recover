import { BaseException } from "@verichron/error-handling/dist";
import { HttpStatus } from "@nestjs/common";

export class OptOutViolationException extends BaseException {
  constructor(debtorId: string, channel: string) {
    super(
      `Debtor '${debtorId}' has opted out of '${channel}' communications`,
      HttpStatus.FORBIDDEN,
      'COMMS_COMPLIANCE_001'
    );
  }
}