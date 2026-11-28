import { BaseException } from "@verichron/error-handling/dist";
import { HttpStatus } from "@nestjs/common";

export class PreferenceNotFoundException extends BaseException {
  constructor(debtorId: string) {
    super(
      `Communication preferences for debtor '${debtorId}' not found`,
      HttpStatus.NOT_FOUND,
      'COMMS_PREF_001'
    );
  }
}