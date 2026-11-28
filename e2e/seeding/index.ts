/**
 * Centralized E2E Seeding
 *
 * This is the single source of truth for all E2E test data seeding.
 * Replaces the scattered seeding logic in fixtures/ui-dev/.
 *
 * Structure:
 * - system/     - Platform configuration (permissions, platform role)
 * - core/       - Required per-org setup (org roles, platform admin user)
 * - test-data/  - Test users, orgs, debtors for development
 */

import { DataSource } from 'typeorm';
import { log } from '../helpers/logger';
import {
  createUsersDbHelper,
  createOrganizationsDbHelper,
  createDebtorsDbHelper,
  createDebtsDbHelper,
  createTransactionsDbHelper,
  createCommunicationsDbHelper,
  createCollectorsDbHelper,
  createWorkflowsDbHelper,
  createVoiceDbHelper,
  DatabaseHelper,
} from '../helpers/database.helper';

// System seeding
import { seedPermissions } from './system/permissions.seed';
import { seedPlatformRole } from './system/platform-role.seed';

// Core seeding
import { seedPlatformAdminUser } from './core/platform-admin-user.seed';
import { seedOrgRoles } from './core/org-roles.seed';

// Test data seeding
import { seedTestOrganizations } from './test-data/organizations.seed';
import { seedOrgUsers, seedMultiOrgUser } from './test-data/org-users.seed';
import { seedCreditors } from './test-data/creditors.seed';
import { seedTestDebtors } from './test-data/debtors.seed';
import { seedChargeOffs } from './test-data/charge-offs.seed';
import { seedSettlements } from './test-data/settlements.seed';
import { seedBankruptcies } from './test-data/bankruptcies.seed';
import { seedWorkQueueItems } from './test-data/work-queue-items.seed';
import { seedCommunicationLogs } from './test-data/communication-logs.seed';
import { seedTeams } from './test-data/teams.seed';
import { seedGoals } from './test-data/goals.seed';
import { seedNotifications } from './test-data/notifications.seed';
import { seedWorkflows } from './test-data/workflows.seed';
import { seedCollectorDailyMetrics } from './test-data/collector-daily-metrics.seed';
import { seedStrategy } from './test-data/strategy.seed';
import { seedCompliance } from './test-data/compliance.seed';
import { seedVoiceConfig } from './test-data/voice-config.seed';

/**
 * Main UI Development Seeding
 *
 * Seeds all test data needed for UI development and integration testing.
 * This is idempotent - safe to run multiple times.
 */
export async function runUiDevSeed() {
  log('\n🚀 Starting Centralized E2E Seeding 🚀\n', 'bright');

  const helpers: DatabaseHelper[] = [];

  try {
    // ========================================================================
    // Step 1: Connect to all databases
    // ========================================================================
    log('🔌 Connecting to databases...', 'cyan');

    const usersDbHelper = createUsersDbHelper();
    const orgsDbHelper = createOrganizationsDbHelper();
    const debtorsDbHelper = createDebtorsDbHelper();
    const debtsDbHelper = createDebtsDbHelper();
    const transactionsDbHelper = createTransactionsDbHelper();
    const communicationsDbHelper = createCommunicationsDbHelper();
    const collectorsDbHelper = createCollectorsDbHelper();
    const workflowsDbHelper = createWorkflowsDbHelper();
    const voiceDbHelper = createVoiceDbHelper();

    helpers.push(usersDbHelper, orgsDbHelper, debtorsDbHelper, debtsDbHelper, transactionsDbHelper, communicationsDbHelper, collectorsDbHelper, workflowsDbHelper, voiceDbHelper);
    await Promise.all(helpers.map(h => h.connect()));

    const usersDataSource = usersDbHelper.getDataSource();
    const orgsDataSource = orgsDbHelper.getDataSource();
    const debtorsDataSource = debtorsDbHelper.getDataSource();
    const debtsDataSource = debtsDbHelper.getDataSource();
    const transactionsDataSource = transactionsDbHelper.getDataSource();
    const communicationsDataSource = communicationsDbHelper.getDataSource();
    const collectorsDataSource = collectorsDbHelper.getDataSource();
    const workflowsDataSource = workflowsDbHelper.getDataSource();
    const voiceDataSource = voiceDbHelper.getDataSource();


    log('✅ All databases connected\n', 'green');

    // ========================================================================
    // Step 2: System Configuration (Permissions & Platform Role)
    // ========================================================================
    log('🔧 Seeding system configuration...', 'bright');

    await seedPermissions(usersDataSource);
    await seedPlatformRole(usersDataSource);

    log('✅ System configuration complete\n', 'green');

    // ========================================================================
    // Step 3: Core Setup (Platform Admin User)
    // ========================================================================
    log('👑 Seeding core platform data...', 'bright');

    await seedPlatformAdminUser(usersDataSource);

    log('✅ Core platform data complete\n', 'green');

    // ========================================================================
    // Step 4: Test Organizations
    // ========================================================================
    log('🏢 Seeding test organizations...', 'bright');

    const { starkIndustries, wayneEnterprises } = await seedTestOrganizations(orgsDataSource);

    log('✅ Test organizations complete\n', 'green');

    // ========================================================================
    // Step 5: Organization Roles
    // ========================================================================
    log('🎭 Seeding organization roles...', 'bright');

    const starkRoles = await seedOrgRoles(
      starkIndustries.id,
      starkIndustries.name,
      usersDataSource
    );

    const wayneRoles = await seedOrgRoles(
      wayneEnterprises.id,
      wayneEnterprises.name,
      usersDataSource
    );

    log('✅ Organization roles complete\n', 'green');

    // ========================================================================
    // Step 6: Strategy Configuration (Approval Thresholds & Authority Matrix)
    // ========================================================================
    log('🎯 Seeding strategy configuration...', 'bright');

    await seedStrategy(
      orgsDataSource,
      [starkIndustries, wayneEnterprises]
    );

    log('✅ Strategy configuration complete\n', 'green');

    // ========================================================================
    // Step 7: Organization Users
    // ========================================================================
    log('👥 Seeding organization users...', 'bright');

    const userMap: Record<string, Array<{ id: string; email: string; role?: string }>> = {};

    // Stark Industries users (diverse team)
    userMap[starkIndustries.id] = await seedOrgUsers(
      starkIndustries,
      starkRoles,
      usersDataSource,
      [
        // Admin
        { email: 'tony.stark@stark.com', firstName: 'Tony', lastName: 'Stark', role: 'orgAdmin' },

        // Managers
        { email: 'happy.hogan@stark.com', firstName: 'Happy', lastName: 'Hogan', role: 'orgManager' },
        { email: 'nick.fury@stark.com', firstName: 'Nick', lastName: 'Fury', role: 'orgManager' },

        // Team Leads
        { email: 'steve.rogers@stark.com', firstName: 'Steve', lastName: 'Rogers', role: 'orgTeamLead' },
        { email: 'carol.danvers@stark.com', firstName: 'Carol', lastName: 'Danvers', role: 'orgTeamLead' },

        // Collectors
        { email: 'natasha.romanoff@stark.com', firstName: 'Natasha', lastName: 'Romanoff', role: 'orgCollector' },
        { email: 'clint.barton@stark.com', firstName: 'Clint', lastName: 'Barton', role: 'orgCollector' },
        { email: 'sam.wilson@stark.com', firstName: 'Sam', lastName: 'Wilson', role: 'orgCollector' },
        { email: 'wanda.maximoff@stark.com', firstName: 'Wanda', lastName: 'Maximoff', role: 'orgCollector' },
        { email: 'scott.lang@stark.com', firstName: 'Scott', lastName: 'Lang', role: 'orgCollector' },

        // Viewer (read-only)
        { email: 'pepper.potts@stark.com', firstName: 'Pepper', lastName: 'Potts', role: 'orgViewer' },
      ]
    );

    // Wayne Enterprises users (diverse team)
    userMap[wayneEnterprises.id] = await seedOrgUsers(
      wayneEnterprises,
      wayneRoles,
      usersDataSource,
      [
        // Admin
        { email: 'bruce.wayne@wayne.com', firstName: 'Bruce', lastName: 'Wayne', role: 'orgAdmin' },

        // Managers
        { email: 'lucius.fox@wayne.com', firstName: 'Lucius', lastName: 'Fox', role: 'orgManager' },

        // Team Leads
        { email: 'barbara.gordon@wayne.com', firstName: 'Barbara', lastName: 'Gordon', role: 'orgTeamLead' },

        // Collectors
        { email: 'dick.grayson@wayne.com', firstName: 'Dick', lastName: 'Grayson', role: 'orgCollector' },
        { email: 'tim.drake@wayne.com', firstName: 'Tim', lastName: 'Drake', role: 'orgCollector' },
        { email: 'jason.todd@wayne.com', firstName: 'Jason', lastName: 'Todd', role: 'orgCollector' },

        // Viewer
        { email: 'alfred.pennyworth@wayne.com', firstName: 'Alfred', lastName: 'Pennyworth', role: 'orgViewer' },
      ]
    );

    // Multi-org user
    await seedMultiOrgUser(
      [
        { org: starkIndustries, roles: starkRoles, roleType: 'orgUser' },
        { org: wayneEnterprises, roles: wayneRoles, roleType: 'orgAdmin' },
      ],
      usersDataSource
    );

    log('✅ Organization users complete\n', 'green');

    // ========================================================================
    // Step 8: Creditors (Original Creditors for Geographic Flows)
    // ========================================================================
    log('🏦 Seeding creditors...', 'bright');

    const creditorMap = await seedCreditors(
      debtsDataSource,
      [
        { id: starkIndustries.id, name: starkIndustries.name },
        { id: wayneEnterprises.id, name: wayneEnterprises.name },
      ]
    );

    log('✅ Creditors complete\n', 'green');

    // ========================================================================
    // Step 9: Debtor Users & Debts (Enhanced with Payment History)
    // ========================================================================
    log('💳 Seeding enhanced debtor data...', 'bright');

    // Define collectors for linking transactions and sticky assignment
    const collectors: Array<{ userId: string; organizationId: string; name: string }> = [];
    
    for (const [orgId, users] of Object.entries(userMap)) {
      const orgCollectors = users.filter(u => u.role === 'orgCollector');
      collectors.push(...orgCollectors.map(u => ({
        userId: u.id,
        organizationId: orgId,
        name: u.email.split('@')[0]
      })));
    }

    const debtorMap = await seedTestDebtors(
      [
        { org: starkIndustries, roles: starkRoles },
        { org: wayneEnterprises, roles: wayneRoles },
      ],
      usersDataSource,
      debtorsDataSource,
      debtsDataSource,
      transactionsDataSource,
      collectors,
      creditorMap
    );

    // Convert Map<string, DebtorInfo[]> to plain object for seed functions
    const debtorLookup: Record<string, Array<{ debtorId: string; debtIds: string[] }>> = {};
    for (const [orgId, debtors] of debtorMap.entries()) {
      debtorLookup[orgId] = debtors.map(debtor => ({
        debtorId: debtor.id,
        debtIds: debtor.debts.map(d => d.id)
      }));
    }

    log('✅ Enhanced debtor data complete\n', 'green');

    // ========================================================================
    // Step 10: Compliance & Preferences
    // ========================================================================
    await seedCompliance(
      orgsDataSource,
      communicationsDataSource,
      [starkIndustries, wayneEnterprises],
      debtorMap
    );

    await seedVoiceConfig(
      voiceDataSource,
      [starkIndustries, wayneEnterprises]
    );

    // ========================================================================
    // Step 11: Charge-Off History
    // ========================================================================
    log('📉 Seeding charge-off history...', 'bright');

    await seedChargeOffs(
      debtsDataSource,
      [
        { id: starkIndustries.id, name: starkIndustries.name },
        { id: wayneEnterprises.id, name: wayneEnterprises.name },
      ],
      debtorLookup
    );

    log('✅ Charge-off history complete\n', 'green');

    // ========================================================================
    // Step 12: Settlement Offers
    // ========================================================================
    log('🤝 Seeding settlement offers...', 'bright');

    await seedSettlements(
      transactionsDataSource,
      [
        { id: starkIndustries.id, name: starkIndustries.name },
        { id: wayneEnterprises.id, name: wayneEnterprises.name },
      ],
      debtorLookup,
      userMap
    );

    log('✅ Settlement offers complete\n', 'green');

    // ========================================================================
    // Step 13: Bankruptcy Filings
    // ========================================================================
    log('⚖️  Seeding bankruptcy filings...', 'bright');

    await seedBankruptcies(
      transactionsDataSource,
      [
        { id: starkIndustries.id, name: starkIndustries.name },
        { id: wayneEnterprises.id, name: wayneEnterprises.name },
      ],
      debtorLookup
    );

    log('✅ Bankruptcy filings complete\n', 'green');

    // ========================================================================
    // Step 14: Work Queue Items
    // ========================================================================
    log('📋 Seeding work queue items...', 'bright');

    await seedWorkQueueItems(
      collectorsDataSource,
      [
        { id: starkIndustries.id, name: starkIndustries.name },
        { id: wayneEnterprises.id, name: wayneEnterprises.name },
      ],
      debtorMap
    );

    log('✅ Work queue items complete\n', 'green');

    // ========================================================================
    // Step 15: Communication Logs (MongoDB)
    // ========================================================================
    log('📞 Seeding communication logs...', 'bright');

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/communications';

    await seedCommunicationLogs(
      mongoUri,
      [
        { id: starkIndustries.id, name: starkIndustries.name },
        { id: wayneEnterprises.id, name: wayneEnterprises.name },
      ],
      collectors,
      debtorMap
    );

    log('✅ Communication logs complete\n', 'green');

    // ========================================================================
    // Step 16: Teams & Memberships
    // ========================================================================
    log('👥 Seeding teams & memberships...', 'bright');

    const teams = await seedTeams(
      orgsDataSource,
      debtsDataSource,
      [starkIndustries, wayneEnterprises],
      userMap
    );

    log('✅ Teams seeding complete\n', 'green');

    // ========================================================================
    // Step 17: Goals & Progress
    // ========================================================================
    log('🎯 Seeding goals & progress...', 'bright');

    await seedGoals(
      collectorsDataSource,
      teams,
      userMap
    );

    log('✅ Goals seeding complete\n', 'green');

    // ========================================================================
    // Step 18: Notifications
    // ========================================================================
    log('🔔 Seeding notifications...', 'bright');

    await seedNotifications(
      collectorsDataSource,
      userMap
    );

    log('✅ Notifications seeding complete\n', 'green');

    // ========================================================================
    // Step 19: Collector Daily Metrics (Accumulator History)
    // ========================================================================
    log('📊 Seeding collector daily metrics history...', 'bright');

    await seedCollectorDailyMetrics(
      collectorsDataSource,
      userMap
    );

    log('✅ Collector daily metrics complete\n', 'green');

    // ========================================================================
    // Step 20: Workflows
    // ========================================================================
    log('⚙️ Seeding workflows...', 'bright');

    await seedWorkflows(
      workflowsDataSource,
      [starkIndustries, wayneEnterprises],
      userMap
    );

    log('✅ Workflows seeding complete\n', 'green');

    // ========================================================================
    // Step 21: Summary
    // ========================================================================
    log('═'.repeat(80), 'yellow');
    log('✅ E2E Seeding Complete!', 'bright');
    log('', 'reset');
    log('Platform:', 'cyan');
    log('  - Platform Admin: platform.admin@verichron.com / Password123!', 'reset');
    log('', 'reset');
    log('Stark Industries (11 users):', 'cyan');
    log('  - Admin:         tony.stark@stark.com', 'reset');
    log('  - Managers:      happy.hogan@stark.com, nick.fury@stark.com', 'reset');
    log('  - Team Leads:    steve.rogers@stark.com, carol.danvers@stark.com', 'reset');
    log('  - Collectors:    natasha.romanoff@stark.com, clint.barton@stark.com', 'reset');
    log('                   sam.wilson@stark.com, wanda.maximoff@stark.com', 'reset');
    log('                   scott.lang@stark.com', 'reset');
    log('  - Viewer:        pepper.potts@stark.com', 'reset');
    log('', 'reset');
    log('Wayne Enterprises (7 users):', 'cyan');
    log('  - Admin:         bruce.wayne@wayne.com', 'reset');
    log('  - Manager:       lucius.fox@wayne.com', 'reset');
    log('  - Team Lead:     barbara.gordon@wayne.com', 'reset');
    log('  - Collectors:    dick.grayson@wayne.com, tim.drake@wayne.com', 'reset');
    log('                   jason.todd@wayne.com', 'reset');
    log('  - Viewer:        alfred.pennyworth@wayne.com', 'reset');
    log('', 'reset');
    log('Strategy Configuration:', 'cyan');
    log('  - Approval Thresholds (Authority Ladder):', 'reset');
    log('    • Collectors:   max 30% discount, $5K cap', 'reset');
    log('    • Team Leads:   max 50% discount, $15K cap', 'reset');
    log('    • Managers:     max 75% discount, no cap', 'reset');
    log('  - Settlement Authority Matrix (9 tiers):', 'reset');
    log('    • Based on balance ranges and debt age', 'reset');
    log('    • Higher discounts for older/larger debts', 'reset');
    log('', 'reset');
    log('Teams & Goals:', 'cyan');
    log('  - Team Alpha seeded with members and revenue/call goals', 'reset');
    log('  - Team Beta seeded with members', 'reset');
    log('  - Individual goals for all collectors', 'reset');
    log('', 'reset');
    log('Notifications:', 'cyan');
    log('  - Sample Compliance and Work Item notifications for all collectors', 'reset');
    log('', 'reset');
    log('Workflows:', 'cyan');
    log('  - Auto-assignment configs for Stark & Wayne', 'reset');
    log('  - Workflow rules for initial contact automation', 'reset');
    log('  - Escalation rules for high-balance accounts', 'reset');
    log('  - Standard Dunning Sequence template', 'reset');
    log('', 'reset');
    log('Enhanced Debtor Data:', 'cyan');
    log('  - 50-100 debtors per organization (realistic volume)', 'reset');
    log('  - 1-10 debts per debtor (varied complexity)', 'reset');
    log('  - Status distribution:', 'reset');
    log('    • IN_COLLECTION (60%), PAID_IN_FULL (20%), PAYMENT_PLAN (10%)', 'reset');
    log('    • SETTLED (5%), CHARGED_OFF (5%)', 'reset');
    log('  - Payment history with transactions for paid/partial debts', 'reset');
    log('  - Payment plans for active plans', 'reset');
    log('  - Recent activity (today) for dashboard metrics', 'reset');
    log('  - Varied dates (portfolios, debts, payments) for trending', 'reset');
    log('', 'reset');
    log('Creditors (Geographic Flows):', 'cyan');
    log('  - 10 diverse creditors per organization', 'reset');
    log('  - Banks, credit unions, utilities, telecom, auto finance', 'reset');
    log('  - Realistic EINs and geographic locations across US states', 'reset');
    log('  - Ready for geographic flows analytics and entity resolution testing', 'reset');
    log('', 'reset');
    log('Charge-Off History:', 'cyan');
    log('  - ~15% of debts have charge-off records (realistic rate)', 'reset');
    log('  - Various reasons: 180-day delinquency, bankruptcy, deceased, uncollectible', 'reset');
    log('  - 30% include recovery amounts (partial collections)', 'reset');
    log('  - Credit bureau reporting tracked', 'reset');
    log('', 'reset');
    log('Settlement Offers:', 'cyan');
    log('  - ~20% of debts have settlement offers (active negotiation)', 'reset');
    log('  - Status mix: 40% pending, 25% accepted, 15% completed, 10% rejected, 10% defaulted', 'reset');
    log('  - Settlement percentages: 30-70% of original balance', 'reset');
    log('  - Lump sum (70%) and installment plans (30%)', 'reset');
    log('  - Some debts show full negotiation history', 'reset');
    log('', 'reset');
    log('Bankruptcy Filings:', 'cyan');
    log('  - ~5% of debtors have bankruptcy cases (realistic filing rate)', 'reset');
    log('  - Chapter distribution: Ch7 (65%), Ch13 (30%), Ch11 (5%)', 'reset');
    log('  - Status mix: Filed, Pending, Discharged, Dismissed, Converted', 'reset');
    log('  - Includes court info, attorney details, proof of claim tracking', 'reset');
    log('  - CRITICAL for FDCPA compliance testing (automatic stay)', 'reset');
    log('', 'reset');
    log('Work Queue Items:', 'cyan');
    log('  - One work queue item per debtor', 'reset');
    log('  - Aggregates total balance and days overdue across all debts', 'reset');
    log('  - Consistent with debtor and debt data', 'reset');
    log('', 'reset');
    log('Communication Logs:', 'cyan');
    log('  - 30-50 communications per collector over last 30 days', 'reset');
    log('  - Mix of EMAIL, SMS, CALL, LETTER types', 'reset');
    log('  - Realistic status distribution (70% delivered, 15% sent, 15% failed)', 'reset');
    log('  - Email engagement tracking (opens, clicks)', 'reset');
    log('  - Ready for collector analytics dashboard', 'reset');
    log('', 'reset');
    log('Collector Metrics (History):', 'cyan');
    log('  - 30 days of pre-aggregated metrics for all collectors', 'reset');
    log('  - Includes calls, emails, SMS, and collection totals', 'reset');
    log('  - Powers the real-time performance timeline charts', 'reset');
    log('', 'reset');
    log('All passwords: Password123!', 'yellow');
    log('═'.repeat(80), 'yellow');

  } finally {
    // Close all database connections
    await Promise.all(helpers.map(h => h.disconnect()));
    log('\n🔌 Database connections closed.', 'reset');
  }
}
