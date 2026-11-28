import { DataSource } from 'typeorm';
import { log } from '../../helpers/logger';
import { TestOrganization } from './organizations.seed';
import { DebtorInfo } from './debtors.seed';
import { StateAbbreviation } from '@verichron/enums';

/**
 * Strategy Configuration: Compliance and Guardrails
 * 
 * Seeds organization-level compliance settings and debtor-specific communication preferences.
 * Ensures the "Block, Don't Flag" logic has data to work with in E2E environments.
 */
export async function seedCompliance(
  orgsDataSource: DataSource,
  communicationsDataSource: DataSource,
  organizations: TestOrganization[],
  debtorMap: Map<string, DebtorInfo[]>
) {
  log('  🛡️ Seeding compliance configuration...', 'cyan');

  // 1. Seed Organization-Level Compliance Settings
  for (const org of organizations) {
    const complianceSettings = {
      compliance: {
        stateSpecificRulesEnabled: ['CA', 'NY', 'MA'],
        recordAllCalls: true,
        fdcpaStrictMode: true
      },
      communicationPreferences: {
        preferredContactTimeStart: '08:00',
        preferredContactTimeEnd: '21:00',
        defaultCommunicationCadence: 'WEEKLY'
      }
    };

    await orgsDataSource.query(
      `UPDATE organizations SET settings = settings || $1 WHERE id = $2`,
      [JSON.stringify(complianceSettings), org.id]
    );
  }

  // 2. Seed Debtor-Specific Preferences (in Communications DB)
  // We ensure every debtor has a preference record with a realistic timezone.
  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix'
  ];

  let totalPrefs = 0;
  for (const [orgId, debtors] of debtorMap.entries()) {
    for (const debtor of debtors) {
      const timezone = timezones[Math.floor(Math.random() * timezones.length)];
      const state = debtor.state || StateAbbreviation.NY;
      
      // Upsert preference
      await communicationsDataSource.query(
        `INSERT INTO debtor_preferences (
          id, debtor_id, organization_id, do_not_contact, opted_out_channels,
          allowed_start_hour, allowed_end_hour, daily_contact_limit, timezone,
          state, preferred_language, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, false, '[]', 8, 21, 3, $3, $4, 'en', NOW(), NOW()
        ) ON CONFLICT (debtor_id, organization_id) DO UPDATE SET 
          timezone = $3,
          state = $4,
          updated_at = NOW()`,
        [debtor.id, orgId, timezone, state]
      );
      totalPrefs++;
    }
  }

  log(`    ✅ Seeded ${totalPrefs} debtor preferences across ${organizations.length} organizations`, 'reset');
  log('    ✅ Compliance settings updated for all organizations', 'reset');
}
