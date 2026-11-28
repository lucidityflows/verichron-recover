import { Injectable } from '@nestjs/common';
import { ComplianceRule, ComplianceContext, ComplianceResult } from './rules.interface';

@Injectable()
export class OptOutRule implements ComplianceRule {
  name = 'OPT_OUT';

  async check(context: ComplianceContext): Promise<ComplianceResult> {
    const { debtorPreferences, communicationType } = context;

    if (debtorPreferences?.optedOutChannels?.includes(communicationType)) {
      return {
        allowed: false,
        reason: `Debtor opted out of ${communicationType} communications`,
      };
    }

    if (debtorPreferences?.doNotContact) {
      return {
        allowed: false,
        reason: 'Debtor requested no contact (Do Not Contact flag)',
      };
    }

    return { allowed: true };
  }
}