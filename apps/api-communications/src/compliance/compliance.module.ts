import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { ComplianceController } from './compliance.controller';
import { TimeOfDayRule } from './rules/time-of-day.rule';
import { FrequencyLimitRule } from './rules/frequency-limit.rule';
import { StateRestrictionRule } from './rules/state-restriction.rule';
import { OptOutRule } from './rules/opt-out.rule';
import { PreferencesModule } from '../preferences/preferences.module';
import { LogsModule } from '../logs/logs.module';
import { InternalAnalyticsModule } from '../internal/analytics/analytics.module';

@Module({
  imports: [PreferencesModule, LogsModule, InternalAnalyticsModule],
  controllers: [ComplianceController],
  providers: [
    ComplianceService,
    TimeOfDayRule,
    FrequencyLimitRule,
    StateRestrictionRule,
    OptOutRule,
  ],
  exports: [ComplianceService],
})
export class ComplianceModule {}