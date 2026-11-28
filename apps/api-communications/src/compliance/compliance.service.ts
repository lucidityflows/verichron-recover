import { Injectable } from '@nestjs/common';
import { ComplianceRule, ComplianceContext, ComplianceResult } from './rules/rules.interface';
import { TimeOfDayRule } from './rules/time-of-day.rule';
import { FrequencyLimitRule } from './rules/frequency-limit.rule';
import { StateRestrictionRule } from './rules/state-restriction.rule';
import { OptOutRule } from './rules/opt-out.rule';
import { PreferencesService } from '../preferences/preferences.service';
import { LogsService } from '../logs/logs.service';

@Injectable()
export class ComplianceService {
  private rules: ComplianceRule[];

  constructor(
    private readonly timeOfDayRule: TimeOfDayRule,
    private readonly frequencyLimitRule: FrequencyLimitRule,
    private readonly stateRestrictionRule: StateRestrictionRule,
    private readonly optOutRule: OptOutRule,
    private readonly preferencesService: PreferencesService,
    private readonly logsService: LogsService,
  ) {
    this.rules = [
      this.optOutRule,          // Check opt-outs first (hard stop)
      this.timeOfDayRule,       // Then time restrictions
      this.frequencyLimitRule,  // Then frequency limits
      this.stateRestrictionRule, // Then state-specific restrictions
    ];
  }

  async checkCompliance(context: ComplianceContext): Promise<ComplianceResult> {
    // Fetch debtor preferences and recent communications
    const [preferences, recentLogs] = await Promise.all([
      this.preferencesService.findByDebtor(context.debtorId, context.organizationId),
      this.logsService.findRecentByDebtor(context.debtorId, 7), // Last 7 days
    ]);

    context.debtorPreferences = preferences;
    context.recentCommunications = recentLogs;
    context.state = preferences?.state;

    // Run all rules in sequence
    for (const rule of this.rules) {
      const result = await rule.check(context);
      if (!result.allowed) {
        return { ...result, ruleName: rule.name }; // Fail fast, adding the rule name
      }
    }

    return { allowed: true };
  }
}