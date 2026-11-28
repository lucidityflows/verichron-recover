#!/usr/bin/env node

/**
 * E2E CLI v2
 * 
 * Unified CLI that combines:
 * 1. The "Migration-First" strategy (Compliance/Auditability)
 * 2. The robust inspection & debugging tools from the original CLI (DX)
 * 
 * Usage:
 *   pnpm e2e setup    -> Start Infra + Apps (Empty DBs)
 *   pnpm e2e migrate  -> Run TypeORM Migrations
 *   pnpm e2e seed     -> Seed System Data (Roles, Permissions, Templates)
 *   pnpm e2e test     -> Run Tests
 */

import { Command } from 'commander';
import * as shell from 'shelljs';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import * as dotenv from 'dotenv';
import { createHealthCheckHelper, UnhealthyServicesError } from './helpers/health-check.helper';
import { createEventListenerHelper } from './helpers/event-listener.helper';
import { EVENT_TOPICS } from '@verichron/events';
import {
  createUsersDbHelper,
  createOrganizationsDbHelper,
  createDebtsDbHelper,
  createDebtorsDbHelper,
  createTransactionsDbHelper,
  createCommunicationsDbHelper,
  createCollectorsDbHelper,
  createVoiceDbHelper,
  createWorkflowsDbHelper,
  createAutomationsDbHelper,
  createAnalyticsDbHelper,
  createAuditsDbHelper,
  DatabaseHelper,
} from './helpers/database.helper';
import { log } from './helpers/logger';
import { uiSetupCommand } from './setup/ui-setup';
import {
  createUsersDbInspector,
  createOrganizationsDbInspector,
  createDebtorsDbInspector,
  createDebtsDbInspector,
  createTransactionsDbInspector,
  createCommunicationsDbInspector,
  createCollectorsDbInspector,
  createVoiceDbInspector,
  createWorkflowsDbInspector,
  createAutomationsDbInspector,
  createAnalyticsDbInspector,
  createAuditsDbInspector,
} from './helpers/db-inspector.helper';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

const program = new Command();
const ROOT_DIR = path.resolve(__dirname, '..');
const COMPOSE_FILE = path.join(ROOT_DIR, 'docker-compose.test.yml');
const ENV_TEST_FILE = path.join(ROOT_DIR, '.env.test');

function exec(command: string, silent = false): shell.ShellString {
  const result = shell.exec(command, { silent });
  return result as shell.ShellString;
}

function execOrExit(command: string, errorMessage?: string): void {
  const result = exec(command);
  if (result.code !== 0) {
    log(errorMessage || `Command failed: ${command}`, 'red');
    process.exit(1);
  }
}

function assertEnvTestExists(): void {
  if (!fs.existsSync(ENV_TEST_FILE)) {
    log(`Missing ${ENV_TEST_FILE}`, 'red');
    log('Create .env.test (you can copy from .env.example or team template) and retry.', 'yellow');
    process.exit(1);
  }
}

function ensureLocalPubSubDefaults(): void {
  // Local E2E always uses the Pub/Sub emulator; no gcloud auth should be required.
  if (!process.env.PUBSUB_PROJECT_ID) {
    process.env.PUBSUB_PROJECT_ID = 'test-project';
  }
  if (!process.env.PUBSUB_EMULATOR_HOST) {
    process.env.PUBSUB_EMULATOR_HOST = 'localhost:8085';
  }
}

// ============================================================================ 
// COMMAND: setup
// Description: Starts containers, waits for health, creates Pub/Sub topics.
// DOES NOT create schemas (that's what 'migrate' is for).
// ============================================================================ 
async function setupCommand() {
  log('\n🚀 Setting up E2E environment (Migration-Mode)...\n', 'bright');
  assertEnvTestExists();
  ensureLocalPubSubDefaults();

  // Step 1: Build
  log('📦 Building Docker Compose services...', 'cyan');
  execOrExit(
    `docker compose -f ${COMPOSE_FILE} build`,
    'Failed to build Docker Compose services.',
  );

  // Step 2: Start Infrastructure
  log('\n📦 Starting infrastructure (Postgres, Redis, Mongo)...', 'cyan');
  execOrExit(
    `docker compose -f ${COMPOSE_FILE} up -d postgres-test redis-test mongo-test pubsub-emulator-test`,
    'Failed to start infrastructure services.',
  );

  // Step 3: Health Check Infra
  log('\n⏳ Waiting for infrastructure...', 'cyan');
  const healthCheck = createHealthCheckHelper();
  try {
    await healthCheck.waitForInfrastructure(60000);
    log('✅ Infrastructure healthy!\n', 'green');

    // Step 4: Pub/Sub Topics
    log('📋 Creating Pub/Sub topics...', 'cyan');
    const eventListener = await createEventListenerHelper();
    const topics = [
        EVENT_TOPICS.ORGANIZATIONS, EVENT_TOPICS.USERS, EVENT_TOPICS.DEBTS,
        EVENT_TOPICS.DEBTORS, EVENT_TOPICS.TRANSACTIONS, EVENT_TOPICS.COMMUNICATIONS,
        EVENT_TOPICS.ANALYTICS, EVENT_TOPICS.COLLECTORS, EVENT_TOPICS.VOICE,
        EVENT_TOPICS.WORKFLOWS, EVENT_TOPICS.AUTOMATIONS, EVENT_TOPICS.ORCHESTRATIONS,
        EVENT_TOPICS.AUDITS
    ];
    for (const topic of topics) {
        log(`  -> Topic: ${topic}`, 'reset');
        await eventListener.ensureTopic(topic);
    }
    log('✅ Topics created!\n', 'green');

    // Step 5: Start Apps
    log('📦 Starting application services...', 'cyan');
    const apps = [
      'api-users-test', 'api-organizations-test', 'api-debts-test', 'api-debtors-test',
      'api-transactions-test', 'api-communications-test', 'api-collectors-test',
      'api-voice-test', 'api-workflows-test', 'api-automations-test', 'api-analytics-test',
      'api-audits-test'
    ];
    execOrExit(
      `docker compose -f ${COMPOSE_FILE} up -d ${apps.join(' ')}`,
      'Failed to start application services.',
    );

    // Step 6: Health Check Apps
    log('\n⏳ Waiting for apps to start...', 'cyan');
    await healthCheck.waitForServices(apps, 180000);
    log('✅ Apps healthy!\n', 'green');

    log('🎉 Setup complete! Containers are running.', 'bright');
    log('⚠️  Databases are currently EMPTY.', 'yellow');
    log('👉 Run "pnpm e2e migrate" to create schemas.', 'cyan');

  } catch (error) {
    handleError(error);
  }
}

// ============================================================================ 
// COMMAND: migrate
// Description: Runs TypeORM migrations inside the containers.
// This ensures we test exactly what runs in production.
// ============================================================================ 
async function migrateCommand() {
  log('\n🐘 Running Database Migrations...\n', 'bright');
  assertEnvTestExists();

  const services = [
    'api-users-test', 'api-organizations-test', 'api-debts-test',
    'api-debtors-test', 'api-transactions-test', 'api-communications-test',
    'api-collectors-test', 'api-voice-test', 'api-workflows-test',
    'api-analytics-test', 'api-audits-test'
  ];

  let failure = false;

  for (const svc of services) {
    process.stdout.write(`  -> Migrating ${svc}... `);
    
    // Run migration via TypeORM CLI inside the container
    const result = exec(
        `docker compose -f ${COMPOSE_FILE} exec -T ${svc} node ./node_modules/typeorm/cli.js migration:run -d dist/datasource.js`,
        true
    );

    if (result.code !== 0 && !result.stdout.includes('No migrations pending')) {
        console.log('❌ FAILED');
        log(`\nError output for ${svc}:`, 'yellow');
        console.log(result.stderr || result.stdout);
        failure = true;
    } else {
        console.log('✅ Success');
    }
  }

  if (failure) {
    log('\n❌ Some migrations failed. Check logs above.', 'red');
    process.exit(1);
  }
  
  log('\n✅ All migrations complete!\n', 'green');
}

// ============================================================================ 
// COMMAND: seed
// Description: Populates system-level data (Roles, Permissions, Templates).
// ============================================================================ 
async function seedCommand() {
  log('\n🌱 Seeding System Defaults...\n', 'bright');
  assertEnvTestExists();
  
  log('  -> api-users (Permissions/Roles)...', 'cyan');
  execOrExit(`docker compose -f ${COMPOSE_FILE} exec -T api-users-test node dist/src/seeding/seed.js`);
  
  log('  -> api-workflows (Templates)...', 'cyan');
  execOrExit(`docker compose -f ${COMPOSE_FILE} exec -T api-workflows-test node dist/src/seeding/seed.js`);

  log('  -> api-communications (Communication Templates)...', 'cyan');
  execOrExit(`docker compose -f ${COMPOSE_FILE} exec -T api-communications-test node dist/src/seeding/seed.js`);

  log('\n✅ System defaults seeded!\n', 'green');
}

// ============================================================================ 
// COMMAND: reset
// Description: Truncates tables in ALL microservices.
// ============================================================================ 
async function resetCommand() {
  log('\n🔄 Resetting ALL Database Tables...\n', 'bright');
  assertEnvTestExists();

  // List of all DB helpers to clean
  const helpers = [
    { name: 'Users', helper: createUsersDbHelper() },
    { name: 'Organizations', helper: createOrganizationsDbHelper() },
    { name: 'Debts', helper: createDebtsDbHelper() },
    { name: 'Debtors', helper: createDebtorsDbHelper() },
    { name: 'Transactions', helper: createTransactionsDbHelper() },
    { name: 'Communications', helper: createCommunicationsDbHelper() },
    { name: 'Collectors', helper: createCollectorsDbHelper() },
    { name: 'Voice', helper: createVoiceDbHelper() },
    { name: 'Workflows', helper: createWorkflowsDbHelper() },
    { name: 'Automations', helper: createAutomationsDbHelper() },
    { name: 'Analytics', helper: createAnalyticsDbHelper() },
    { name: 'Audits', helper: createAuditsDbHelper() },
  ];

  for (const { name, helper } of helpers) {
    process.stdout.write(`  -> Cleaning ${name} DB... `);
    try {
      await helper.connect();
      await helper.cleanAllTables();
      await helper.disconnect();
      console.log('✅');
    } catch (e) {
      console.log('❌');
      log(`Error cleaning ${name}: ${e}`, 'red');
    }
  }
  log('\n✅ Reset complete!\n', 'green');
}

// ============================================================================ 
// COMMAND: status
// ============================================================================ 
async function statusCommand() {
  log('\n📊 Environment Status\n', 'bright');
  const healthCheck = createHealthCheckHelper();
  const infrastructure = await healthCheck.checkInfrastructure();
  healthCheck.printHealthStatus(infrastructure);

  const result = exec(`docker compose -f ${COMPOSE_FILE} ps --format json`, true);
  if (result.code === 0 && result.stdout.trim()) {
    const containers = result.stdout.trim().split('\n').map(l => JSON.parse(l));
    log('\n🐳 Containers:', 'bright');
    containers.forEach((c: any) => {
      const icon = c.State === 'running' ? '✅' : '❌';
      log(`${icon} ${c.Name.padEnd(25)} ${c.State}`, 'reset');
    });
  }
  console.log('');
}

// ============================================================================ 
// COMMAND: db:inspect
// Description: Restored from original CLI. Dumps table counts.
// ============================================================================ 
async function inspectDatabaseCommand(dbName?: string) {
  log('\n🔍 Inspecting Database...', 'bright');

  const dbToInspect = dbName || 'all';
  const inspectors = [
    { key: 'users_db', helper: createUsersDbHelper, inspector: createUsersDbInspector },
    { key: 'organizations_db', helper: createOrganizationsDbHelper, inspector: createOrganizationsDbInspector },
    { key: 'debtors_db', helper: createDebtorsDbHelper, inspector: createDebtorsDbInspector },
    { key: 'debts_db', helper: createDebtsDbHelper, inspector: createDebtsDbInspector },
    { key: 'transactions_db', helper: createTransactionsDbHelper, inspector: createTransactionsDbInspector },
    { key: 'communications_db', helper: createCommunicationsDbHelper, inspector: createCommunicationsDbInspector },
    { key: 'collectors_db', helper: createCollectorsDbHelper, inspector: createCollectorsDbInspector },
    { key: 'voice_db', helper: createVoiceDbHelper, inspector: createVoiceDbInspector },
    { key: 'workflows_db', helper: createWorkflowsDbHelper, inspector: createWorkflowsDbInspector },
    { key: 'automations_db', helper: createAutomationsDbHelper, inspector: createAutomationsDbInspector },
    { key: 'analytics_db', helper: createAnalyticsDbHelper, inspector: createAnalyticsDbInspector },
    { key: 'audits_db', helper: createAuditsDbHelper, inspector: createAuditsDbInspector },
  ];

  for (const { key, helper: createHelper, inspector: createInspector } of inspectors) {
    if (dbToInspect === 'all' || dbToInspect === key) {
      const h = createHelper();
      await h.connect();
      const i = createInspector(h.getDataSource());
      await i.printDatabaseSummary();
      await h.disconnect();
    }
  }
  log('\n✅ Inspection complete!\n', 'green');
}

// ============================================================================ 
// COMMAND: db:verify
// Description: Restored from original CLI. Checks specific seed data.
// ============================================================================ 
async function verifyDatabaseCommand() {
  log('\n🔍 Verifying Seeding Integrity...', 'bright');
  assertEnvTestExists();
  const expectedUsers = [
    'platform.admin@verichron.com', 'tony.stark@stark.com', 'happy.hogan@stark.com',
    'natasha.romanoff@stark.com', 'pepper.potts@stark.com', 'bruce.wayne@wayne.com',
    'peter.parker@verichron.com', 'steve.rogers@verichron.com',
    'diana.prince@verichron.com', 'clark.kent@verichron.com',
  ];

  const usersHelper = createUsersDbHelper();
  await usersHelper.connect();
  const inspector = createUsersDbInspector(usersHelper.getDataSource());
  const allValid = await inspector.printUserVerification(expectedUsers);
  await usersHelper.disconnect();

  if (allValid) {
    log('\n✅ Verification passed!\n', 'green');
  } else {
    log('\n❌ Verification failed! Run "pnpm e2e ui-setup" to fix.\n', 'red');
    process.exit(1);
  }
}

// ============================================================================ 
// UTILITIES
// ============================================================================ 
function handleError(error: any) {
    if (error instanceof UnhealthyServicesError) {
      log(`❌ ${error.message}`, 'red');
      error.unhealthyServices.forEach(service => {
        log(`\n--- Logs for ${service} ---\n`, 'yellow');
        exec(`docker compose -f ${COMPOSE_FILE} logs --tail=50 ${service}`);
      });
    } else if (error instanceof Error) {
      log(`❌ Error: ${error.message}`, 'red');
    }
    process.exit(1);
}

function logsCommand(service?: string) {
  log(`\n📜 Viewing logs ${service || ''}...\n`, 'bright');
  exec(`docker compose -f ${COMPOSE_FILE} logs -f ${service || ''}`);
}

async function cleanCommand(options: { all?: boolean }) {
  log('\n🧹 Cleaning Environment...\n', 'bright');
  exec(`docker compose -f ${COMPOSE_FILE} down -v --remove-orphans`);
  
  const imagesToRemove = [
    'api-users-test', 'api-organizations-test', 'api-debts-test',
    'api-debtors-test', 'api-transactions-test', 'api-communications-test',
    'api-collectors-test', 'api-voice-test', 'api-workflows-test',
    'api-automations-test', 'api-analytics-test', 'api-audits-test'
  ];

  if (options.all) {
    imagesToRemove.push('postgres:16-alpine', 'redis:7-alpine', 'gcr.io/google.com/cloudsdktool/cloud-sdk:emulators');
  }
  
  imagesToRemove.forEach(imageName => {
    const res = exec(`docker images --filter "reference=${imageName}" -q`, true);
    if (res.stdout.trim()) {
      res.stdout.trim().split('\n').forEach(id => exec(`docker rmi -f ${id}`, true));
    }
  });
  log('\n✅ Cleaned!\n', 'green');
}

async function testCommand(options: any) {
  log('\n🧪 Running tests...\n', 'bright');
  const logFile = path.join(ROOT_DIR, 'e2e-latest.log');
  const cmd = options.service 
    ? `pnpm --filter @verichron/${options.service} test:e2e`
    : `pnpm --filter @verichron/e2e test ${options.watch ? '--watch' : ''} ${options.journey ? '--testPathPattern=' + options.journey : ''}`;
  
  await execWithTee(cmd, logFile);
}

async function execWithTee(command: string, logFilePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const logStream = fs.createWriteStream(logFilePath);
    const parts = command.split(' ');
    const child = spawn(parts[0], parts.slice(1), { env: process.env, shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
    child.stdout.on('data', d => { logStream.write(d); process.stdout.write(d); });
    child.stderr.on('data', d => { logStream.write(d); process.stderr.write(d); });
    child.on('close', code => { logStream.end(); code === 0 ? resolve() : reject(new Error('Failed')); });
  });
}

// ============================================================================ 
// CLI SETUP
// ============================================================================ 
program.name('e2e-v2').version('2.0.0');

// Infra & Apps
program.command('setup').description('Start containers (Empty DB)').action(setupCommand);
program.command('migrate').description('Run TypeORM Migrations').action(migrateCommand);
program.command('seed').description('Seed System Defaults').action(seedCommand);
program.command('ui-setup').description('Seed UI Dev Data').action(async () => {
    await uiSetupCommand();
    log('\n✅ Done.\n', 'green');
});

// Maintenance
program.command('reset').description('Clean ALL Tables').action(resetCommand);
program.command('status').action(statusCommand);
program.command('logs [svc]').action(logsCommand);
program.command('clean').option('--all').action(cleanCommand);
program.command('teardown').action(async () => execOrExit(`docker compose -f ${COMPOSE_FILE} down`));

// Debugging
program.command('db:inspect [db]').action(inspectDatabaseCommand);
program.command('db:verify').action(verifyDatabaseCommand);
program.command('db:psql [db]').action((db) => {
    const targetDb = db || 'users_db';
    log(`\n🔌 Connecting to ${targetDb}...\n`, 'cyan');
    exec(`docker compose -f ${COMPOSE_FILE} exec postgres-test psql -U postgres -d ${targetDb}`);
});

// Testing
program.command('test').option('-s, --service <n>').option('-w, --watch').option('-j, --journey <j>').action(testCommand);

program.parse(process.argv);
