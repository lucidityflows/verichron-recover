import { Injectable } from '@nestjs/common';
import { ComplianceRule, ComplianceContext, ComplianceResult } from './rules.interface';
import { CommunicationLog } from '../../logs/schemas/communication-log.schema';

@Injectable()
export class FrequencyLimitRule implements ComplianceRule {
  name = 'FREQUENCY_LIMIT';

  async check(context: ComplianceContext): Promise<ComplianceResult> {
    const { recentCommunications, communicationType, debtorPreferences } = context;
    
    // 1. Check Daily Limit (Organization/Debtor Level)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysCommunications = recentCommunications?.filter((log: CommunicationLog) => {
      if (!log.sentAt) return false;
      const logDate = new Date(log.sentAt);
      return logDate >= today;
    }) || [];

    const dailyLimit = debtorPreferences?.dailyContactLimit || 3;

    if (todaysCommunications.length >= dailyLimit) {
      return {
        allowed: false,
        reason: `Daily contact limit of ${dailyLimit} reached.`,
      };
    }

    // 2. Check Weekly Limit (Reg F 7-in-7 Rule)
    // Reg F generally limits to 7 attempts per 7 rolling days.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weeklyCommunications = recentCommunications?.filter((log: CommunicationLog) => {
      if (!log.sentAt) return false;
      const logDate = new Date(log.sentAt);
      return logDate >= sevenDaysAgo;
    }) || [];

    const weeklyLimit = 7; // Standard Reg F limit

    if (weeklyCommunications.length >= weeklyLimit) {
      return {
        allowed: false,
        reason: `Reg F frequency limit reached: Max 7 contacts allowed per 7-day rolling window.`,
      };
    }

    return { allowed: true };
  }
}