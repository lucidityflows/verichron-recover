import { DataSource } from 'typeorm';
import { createDebtorPreferenceFactory, type DebtorPreference } from '../factories';

/**
 * Seed: Debtor Communication Preferences Scenario
 *
 * Creates various debtor communication preference scenarios for testing
 * opt-out handling, channel preferences, and compliance requirements.
 *
 * Scenario Setup:
 * - Debtor with default preferences (all channels enabled)
 * - Debtor with do-not-contact flag (global opt-out)
 * - Debtor with SMS opt-out (email/letter only)
 * - Debtor with email-only preference
 * - Debtor with custom time restrictions
 *
 * Expected Test Behavior:
 * - Communication system respects opt-out preferences
 * - FDCPA time restrictions are enforced
 * - Channel preferences are honored
 * - Daily contact limits are enforced
 *
 * @example
 * ```typescript
 * const scenario = await seedDebtorCommunicationPreferences(communicationsDataSource, {
 *   organizationId: org.id,
 *   debtorIds: [debtor1.id, debtor2.id, debtor3.id, debtor4.id, debtor5.id],
 * });
 *
 * expect(scenario.defaultPreferences).toBeDefined();
 * expect(scenario.doNotContactPreferences).toBeDefined();
 * expect(scenario.smsOptOutPreferences).toBeDefined();
 * expect(scenario.emailOnlyPreferences).toBeDefined();
 * expect(scenario.timeRestrictedPreferences).toBeDefined();
 * ```
 */

export interface SeedDebtorCommunicationPreferencesOptions {
  organizationId: string;
  debtorIds: string[]; // Expects 5 debtor IDs for different scenarios
}

export interface DebtorCommunicationPreferencesScenario {
  organizationId: string;
  defaultPreferences: DebtorPreference;
  doNotContactPreferences: DebtorPreference;
  smsOptOutPreferences: DebtorPreference;
  emailOnlyPreferences: DebtorPreference;
  timeRestrictedPreferences: DebtorPreference;
  allPreferences: DebtorPreference[];
}

export async function seedDebtorCommunicationPreferences(
  dataSource: DataSource,
  options: SeedDebtorCommunicationPreferencesOptions,
): Promise<DebtorCommunicationPreferencesScenario> {
  const preferenceFactory = createDebtorPreferenceFactory(dataSource);

  if (options.debtorIds.length < 5) {
    throw new Error('seedDebtorCommunicationPreferences requires at least 5 debtor IDs');
  }

  // Scenario 1: Default preferences (all channels enabled)
  const defaultPreferences = await preferenceFactory.createDefaultPreference({
    debtorId: options.debtorIds[0],
    organizationId: options.organizationId,
    timezone: 'America/New_York',
  });

  // Scenario 2: Global do-not-contact
  const doNotContactPreferences = await preferenceFactory.createDoNotContactPreference({
    debtorId: options.debtorIds[1],
    organizationId: options.organizationId,
  });

  // Scenario 3: SMS opt-out (email and letter allowed)
  const smsOptOutPreferences = await preferenceFactory.createChannelOptOutPreference({
    debtorId: options.debtorIds[2],
    organizationId: options.organizationId,
    optedOutChannels: ['SMS'],
  });

  // Scenario 4: Email-only preference
  const emailOnlyPreferences = await preferenceFactory.createEmailOnlyPreference({
    debtorId: options.debtorIds[3],
    organizationId: options.organizationId,
  });

  // Scenario 5: Custom time restrictions (10am-6pm PST)
  const timeRestrictedPreferences = await preferenceFactory.createTimeRestrictedPreference({
    debtorId: options.debtorIds[4],
    organizationId: options.organizationId,
    allowedStartHour: 10,
    allowedEndHour: 18,
    timezone: 'America/Los_Angeles',
  });

  const allPreferences = [
    defaultPreferences,
    doNotContactPreferences,
    smsOptOutPreferences,
    emailOnlyPreferences,
    timeRestrictedPreferences,
  ];

  return {
    organizationId: options.organizationId,
    defaultPreferences,
    doNotContactPreferences,
    smsOptOutPreferences,
    emailOnlyPreferences,
    timeRestrictedPreferences,
    allPreferences,
  };
}
