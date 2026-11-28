import { Injectable, Logger } from '@nestjs/common';
import { ComplianceRule, ComplianceContext, ComplianceResult } from './rules.interface';

@Injectable()
export class TimeOfDayRule implements ComplianceRule {
  private readonly logger = new Logger(TimeOfDayRule.name);
  name = 'TIME_OF_DAY';

  async check(context: ComplianceContext): Promise<ComplianceResult> {
    const { scheduledAt, debtorPreferences } = context;
    const checkTime = scheduledAt || new Date();
    
    // Default timezone to UTC if not provided
    const debtorTimezone = debtorPreferences?.timezone || 'UTC';
    
    // Get the hour in the debtor's local timezone
    let localHour: number;
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        hour12: false,
        timeZone: debtorTimezone,
      });
      localHour = parseInt(formatter.format(checkTime), 10);
    } catch (error) {
      this.logger.error(`Invalid timezone encountered: ${debtorTimezone}. Defaulting to server time check.`);
      localHour = checkTime.getHours();
    }

    const minHour = debtorPreferences?.allowedStartHour ?? 8;
    const maxHour = debtorPreferences?.allowedEndHour ?? 21;

    if (localHour < minHour || localHour >= maxHour) {
      return {
        allowed: false,
        reason: `Contact not allowed at ${localHour}:00 in debtor's timezone (${debtorTimezone}). Permitted: ${minHour}:00-${maxHour}:00`,
      };
    }

    return { allowed: true };
  }
}