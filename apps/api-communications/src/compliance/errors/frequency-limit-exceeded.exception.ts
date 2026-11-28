import { BaseException } from "@verichron/error-handling/dist";
import { HttpStatus } from "@nestjs/common";

export class FrequencyLimitExceededException extends BaseException {
  constructor(debtorId: string, limit: number, nextAllowedAt: Date) {
    super(
      `Daily contact limit of ${limit} reached for debtor '${debtorId}'`,
      HttpStatus.FORBIDDEN,
      'COMMS_COMPLIANCE_002'
    );
  }
}