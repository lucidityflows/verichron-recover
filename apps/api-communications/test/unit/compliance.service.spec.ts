import { TestingModule } from '@nestjs/testing';
import { createSilentTestingModule } from '@verichron/testing';
import { ComplianceService } from '../../src/compliance/compliance.service';
import { TimeOfDayRule } from '../../src/compliance/rules/time-of-day.rule';
import { FrequencyLimitRule } from '../../src/compliance/rules/frequency-limit.rule';
import { StateRestrictionRule } from '../../src/compliance/rules/state-restriction.rule';
import { OptOutRule } from '../../src/compliance/rules/opt-out.rule';
import { PreferencesService } from '../../src/preferences/preferences.service';
import { LogsService } from '../../src/logs/logs.service';
import { CommunicationType, PreferenceChannel } from '@verichron/enums';

describe('ComplianceService', () => {
  let service: ComplianceService;
  let timeOfDayRule: jest.Mocked<TimeOfDayRule>;
  let frequencyLimitRule: jest.Mocked<FrequencyLimitRule>;
  let stateRestrictionRule: jest.Mocked<StateRestrictionRule>;
  let optOutRule: jest.Mocked<OptOutRule>;
  let preferencesService: jest.Mocked<PreferencesService>;
  let logsService: jest.Mocked<LogsService>;

  beforeEach(async () => {
    const module: TestingModule = await createSilentTestingModule({
      providers: [
        ComplianceService,
        {
          provide: TimeOfDayRule,
          useValue: { check: jest.fn(), name: 'TIME_OF_DAY' },
        },
        {
          provide: FrequencyLimitRule,
          useValue: { check: jest.fn(), name: 'FREQUENCY_LIMIT' },
        },
        {
          provide: StateRestrictionRule,
          useValue: { check: jest.fn(), name: 'STATE_RESTRICTION' },
        },
        {
          provide: OptOutRule,
          useValue: { check: jest.fn(), name: 'OPT_OUT' },
        },
        {
          provide: PreferencesService,
          useValue: { findByDebtor: jest.fn() },
        },
        {
          provide: LogsService,
          useValue: { findRecentByDebtor: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ComplianceService>(ComplianceService);
    timeOfDayRule = module.get(TimeOfDayRule);
    frequencyLimitRule = module.get(FrequencyLimitRule);
    stateRestrictionRule = module.get(StateRestrictionRule);
    optOutRule = module.get(OptOutRule);
    preferencesService = module.get(PreferencesService);
    logsService = module.get(LogsService);
  });

  describe('checkCompliance', () => {
    it('should allow communication when all rules pass', async () => {
      // Arrange
      const context = {
        debtorId: 'debtor-123',
        organizationId: 'org-456',
        communicationType: CommunicationType.EMAIL,
      };

      preferencesService.findByDebtor.mockResolvedValue({
        optedOutChannels: [],
        doNotContact: false,
        allowedStartHour: 8,
        allowedEndHour: 21,
        dailyContactLimit: 3,
      } as any);

      logsService.findRecentByDebtor.mockResolvedValue([]);

      optOutRule.check.mockResolvedValue({ allowed: true });
      timeOfDayRule.check.mockResolvedValue({ allowed: true });
      frequencyLimitRule.check.mockResolvedValue({ allowed: true });
      stateRestrictionRule.check.mockResolvedValue({ allowed: true });

      // Act
      const result = await service.checkCompliance(context);

      // Assert
      expect(result.allowed).toBe(true);
      expect(optOutRule.check).toHaveBeenCalled();
      expect(timeOfDayRule.check).toHaveBeenCalled();
      expect(frequencyLimitRule.check).toHaveBeenCalled();
    });

    it('should fail fast on opt-out violation', async () => {
      // Arrange
      const context = {
        debtorId: 'debtor-123',
        organizationId: 'org-456',
        communicationType: CommunicationType.EMAIL,
      };

      preferencesService.findByDebtor.mockResolvedValue({
        optedOutChannels: [PreferenceChannel.EMAIL],
        doNotContact: false,
      } as any);

      logsService.findRecentByDebtor.mockResolvedValue([]);

      optOutRule.check.mockResolvedValue({
        allowed: false,
        reason: 'Debtor opted out of EMAIL',
      });

      // Act
      const result = await service.checkCompliance(context);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('opted out');
      expect(timeOfDayRule.check).not.toHaveBeenCalled(); // Fast fail
      expect(frequencyLimitRule.check).not.toHaveBeenCalled();
    });
  });
});
