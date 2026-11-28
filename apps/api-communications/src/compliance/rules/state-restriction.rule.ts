import { Injectable } from '@nestjs/common';
import { ComplianceRule, ComplianceContext, ComplianceResult } from './rules.interface';
import { StateAbbreviation, CommunicationType } from '@verichron/enums';
import { CommunicationLog } from '../../logs/schemas/communication-log.schema';

@Injectable()
export class StateRestrictionRule implements ComplianceRule {
  name = 'JURISDICTION';

  async check(context: ComplianceContext): Promise<ComplianceResult> {
    const { state, recentCommunications, communicationType } = context;

    if (!state) {
      return { allowed: true };
    }

    // 1. Massachusetts (MA) Specific Hard Lock
    // Rule: 940 CMR 7.00 - Max 2 calls per 7 days (debtor total, any channel that counts as a call)
    if (state === StateAbbreviation.MA && communicationType === CommunicationType.CALL) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentMACalls = recentCommunications?.filter((log: CommunicationLog) => {
        if (!log.sentAt) return false;
        const logDate = new Date(log.sentAt);
        return logDate >= sevenDaysAgo && log.type === CommunicationType.CALL;
      }) || [];

      if (recentMACalls.length >= 2) {
        return {
          allowed: false,
          reason: 'Massachusetts State Law (940 CMR 7.00) Violation: Max 2 calls per 7 days allowed.',
        };
      }
    }

    // Future states can be added here (e.g. CA, NY restrictions)

    return { allowed: true };
  }
}
