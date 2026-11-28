#!/usr/bin/env node

/**
 * Verichron Operations CLI (vops)
 * A unified command-line interface for managing Verichron infrastructure and deployments.
 *
 * Usage: node scripts/vops.js
 *
 * Features:
 * - Organized menu with 7 categories
 * - Descriptions for all commands
 * - Confirmation prompts for destructive operations
 * - Secrets management and validation tools
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

// Configuration
const PROJECT_ID = 'verichron-recover-staging';
const REGION = 'us-central1';

// ANSI Colors
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  gray: "\x1b[90m"
};

const scriptsDir = __dirname;

// =============================================================================
// MENU DEFINITIONS
// =============================================================================

const mainMenu = [
  { key: '1', label: 'Deployments', action: 'deployMenu' },
  { key: '2', label: 'Database', action: 'dbMenu' },
  { key: '3', label: 'Seeding', action: 'seedMenu' },
  { key: '4', label: 'Secrets Management', action: 'secretsMenu' },
  { key: '5', label: 'Monitoring & Status', action: 'statusMenu' },
  { key: '6', label: 'Testing', action: 'testMenu' },
  { key: '7', label: 'Utilities', action: 'utilsMenu' },
  { key: 'q', label: 'Exit', action: 'exit' }
];

const deployMenu = [
  {
    key: '1',
    label: 'Deploy Single API Service',
    description: 'Build, push, and deploy one API microservice to Cloud Run.\nShows all secrets that will be configured before deployment.\nUse this for quick iterations on a specific service.',
    script: 'deploy-single-staging.sh',
    argPrompt: 'Service name (e.g., api-users, api-communications): '
  },
  {
    key: '2',
    label: 'Deploy ALL Staging APIs',
    description: 'Full deployment of all 12 API microservices to Cloud Run.\nIncludes: Docker build, push to Artifact Registry, Cloud Run deploy.\nAlso creates any missing Pub/Sub topics.',
    script: 'deploy-all-staging.sh'
  },
  {
    key: '3',
    label: 'Deploy ALL APIs (Skip Build)',
    description: 'Redeploy all APIs using existing Docker images.\nUse this after fixing secrets or env vars to pick up changes.',
    script: 'deploy-all-staging.sh',
    args: ['--skip-build']
  },
  {
    key: '4',
    label: 'Deploy Staging UIs',
    description: 'Deploy Auth, Managers, Collectors, and Ops UIs to GCS buckets.\nInjects VITE_API_* environment variables during build.',
    script: 'deploy-staging-uis.sh'
  },
  {
    key: '5',
    label: 'Deploy Extra UIs (Cloud Run)',
    description: 'Deploy ui-ops and ui-collectors to Cloud Run.\nBypasses backend bucket quota limits.\nRun "Setup Load Balancer" after this to ensure NEGs are linked.',
    script: 'deploy-extra-uis-cloudrun.sh'
  },
  {
    key: '6',
    label: 'Deploy Marketing Site',
    description: 'Deploy ui-marketing to the main verichroninc.com bucket.\nSupports both production and staging modes.',
    script: 'deploy-ui-marketing.sh'
  },
  { key: 'b', label: 'Back to Main Menu', action: 'mainMenu' }
];

const dbMenu = [
  {
    key: '1',
    label: 'Run Migration (Single Service)',
    description: 'Trigger database migration for one service via Cloud Run Job.\nRuns TypeORM migrations remotely - no local setup required.\nSafe to run multiple times (migrations are idempotent).',
    script: 'migrate-staging.sh',
    argPrompt: 'Service name (e.g., api-users, api-debts): '
  },
  {
    key: '2',
    label: 'Run Migrations (Local Proxy)',
    description: 'Run TypeORM migrations for all services via Cloud SQL Proxy.\nRequires Cloud SQL Proxy installed locally.\nUse Cloud Run Jobs method if this fails.',
    script: 'run-migrations-staging.sh'
  },
  {
    key: '3',
    label: 'RESET ALL Staging Data',
    description: 'DESTRUCTIVE: Truncates ALL tables in ALL staging databases.\nUses Cloud Run Jobs - no local setup required.\nSchema and migrations preserved. Re-seed after this.',
    script: 'reset-staging-jobs.sh',
    destructive: true
  },
  {
    key: '4',
    label: 'Reset Single Service DB',
    description: 'Reset database for one service only.\nUseful for targeted cleanup without affecting other services.',
    script: 'reset-staging-jobs.sh',
    argPrompt: 'Service name (e.g., api-users, api-communications): '
  },
  {
    key: '5',
    label: 'Check Database Status',
    description: 'List all databases in the Cloud SQL staging instance.\nUseful for verifying database creation.',
    command: `gcloud sql databases list --instance=verichron-recover --project=${PROJECT_ID}`
  },
  { key: 'b', label: 'Back to Main Menu', action: 'mainMenu' }
];

const seedMenu = [
  {
    key: '1',
    label: 'Seed Platform Admin (api-users)',
    description: 'Creates the initial platform admin user in users_db.\nAdmin email: robert.torres@verichroninc.com\nRequired before you can log into the platform.',
    script: 'seed-users-staging.sh'
  },
  {
    key: '2',
    label: 'Seed Email Templates (api-communications)',
    description: 'Creates email templates including USER_INVITATION.\nRequired for the organization onboarding flow to send emails.',
    script: 'seed-communications-staging.sh'
  },
  {
    key: '3',
    label: 'Seed Workflows (api-workflows)',
    description: 'Creates default workflow templates.\nRequired for automation features.',
    script: 'seed-workflows-staging.sh'
  },
  { key: 'b', label: 'Back to Main Menu', action: 'mainMenu' }
];

const secretsMenu = [
  {
    key: '1',
    label: 'View All GCP Secrets',
    description: 'Lists all secrets in GCP Secret Manager.\nShows name, creation date, and replication policy.',
    script: 'list-secrets.sh'
  },
  {
    key: '2',
    label: 'View Secret Value',
    description: 'Retrieve and display the current value of a specific secret.\nAlso detects whitespace issues that can cause runtime errors.',
    script: 'view-secret.sh',
    argPrompt: 'Secret name (e.g., JWT_ACCESS_TOKEN_EXPIRES_IN): '
  },
  {
    key: '3',
    label: 'Search Secrets',
    description: 'Search for secrets by name pattern.\nShows matching secrets with their values.',
    script: 'view-secret.sh',
    args: ['--search'],
    argPrompt: 'Search pattern (e.g., JWT, DATABASE, SENDGRID): '
  },
  {
    key: '4',
    label: 'Validate All Secrets',
    description: 'Scan ALL secrets for common issues:\n- Trailing whitespace (causes runtime errors)\n- Leading whitespace\n- Empty values\n- Newline characters',
    script: 'validate-secrets.sh'
  },
  {
    key: '5',
    label: 'Fix Whitespace (All Secrets)',
    description: 'Automatically fix trailing/leading whitespace in ALL secrets.\nCreates new versions with trimmed values.\nYou must redeploy services after fixing.',
    script: 'fix-secret-whitespace.sh',
    args: ['--all']
  },
  {
    key: '6',
    label: 'Fix Whitespace (Single Secret)',
    description: 'Fix whitespace in a specific secret.\nUse after running "Validate All Secrets" to fix individual issues.',
    script: 'fix-secret-whitespace.sh',
    argPrompt: 'Secret name to fix: '
  },
  {
    key: '7',
    label: 'Sync .env.stage to GCP',
    description: 'Upload all secrets from .env.stage to GCP Secret Manager.\nAutomatically trims whitespace during upload.\nCreates new versions if secrets already exist.',
    script: 'create-secrets.sh'
  },
  {
    key: '8',
    label: 'Fetch Service URLs to .env.stage',
    description: 'Fetches deployed Cloud Run service URLs and updates .env.stage.\nRun this after deploying services to update inter-service URLs.\nCreates a backup before modifying.',
    script: 'update-service-urls-staging.sh'
  },
  {
    key: '9',
    label: 'Compare Local vs GCP Secrets',
    description: 'Compares values in .env.stage with GCP Secret Manager.\nIdentifies mismatches that could cause deployment issues.',
    script: 'compare-secrets.sh'
  },
  {
    key: 'a',
    label: 'Verify Service Secrets',
    description: 'Check if a Cloud Run service has all required secrets configured.\nCompares expected secrets against what is actually deployed.',
    script: 'verify-service-secrets.sh',
    argPrompt: 'Service name (e.g., api-users) or --all: '
  },
  { key: 'b', label: 'Back to Main Menu', action: 'mainMenu' }
];

const statusMenu = [
  {
    key: '1',
    label: 'Verify Deployment Health',
    description: 'Health check for all deployed services.\nTests /health endpoints and shows resource allocation.',
    script: 'verify-deployment-staging.sh'
  },
  {
    key: '2',
    label: 'View Service Logs',
    description: 'View recent logs for a specific Cloud Run service.',
    action: 'logsMenu'
  },
  {
    key: '3',
    label: 'List Cloud Run Services',
    description: 'List all Cloud Run services with their URLs and status.',
    command: `gcloud run services list --project=${PROJECT_ID} --region=${REGION}`
  },
  {
    key: '4',
    label: 'Check SSL Certificates',
    description: 'View status of managed SSL certificates.',
    command: `gcloud compute ssl-certificates describe verichron-staging-cert --global --project=${PROJECT_ID}`
  },
  {
    key: '5',
    label: 'Wake Up ALL APIs (Demo Mode)',
    description: 'Set min-instances=1 for all services to eliminate cold starts.\nUseful for demos. Increases costs.',
    command: `for svc in api-users api-organizations api-debts api-debtors api-transactions api-communications api-collectors api-voice api-workflows api-automations api-analytics api-audits; do echo "Waking \${svc}..." && gcloud run services update \${svc}-staging --min-instances=1 --region=${REGION} --project=${PROJECT_ID} --quiet; done && echo "All services warmed up!"`
  },
  {
    key: '6',
    label: 'Sleep ALL APIs (Cost Save)',
    description: 'Set min-instances=0 for all services to scale to zero.\nReduces costs when not actively testing.',
    command: `for svc in api-users api-organizations api-debts api-debtors api-transactions api-communications api-collectors api-voice api-workflows api-automations api-analytics api-audits; do echo "Sleeping \${svc}..." && gcloud run services update \${svc}-staging --min-instances=0 --region=${REGION} --project=${PROJECT_ID} --quiet; done && echo "All services set to scale-to-zero!"`
  },
  { key: 'b', label: 'Back to Main Menu', action: 'mainMenu' }
];

const logsMenu = [
  { key: '1', label: 'api-users', logs: 'api-users-staging' },
  { key: '2', label: 'api-organizations', logs: 'api-organizations-staging' },
  { key: '3', label: 'api-debts', logs: 'api-debts-staging' },
  { key: '4', label: 'api-debtors', logs: 'api-debtors-staging' },
  { key: '5', label: 'api-transactions', logs: 'api-transactions-staging' },
  { key: '6', label: 'api-communications', logs: 'api-communications-staging' },
  { key: '7', label: 'api-collectors', logs: 'api-collectors-staging' },
  { key: '8', label: 'api-voice', logs: 'api-voice-staging' },
  { key: '9', label: 'api-workflows', logs: 'api-workflows-staging' },
  { key: 'a', label: 'api-automations', logs: 'api-automations-staging' },
  { key: 's', label: 'api-analytics', logs: 'api-analytics-staging' },
  { key: 'd', label: 'api-audits', logs: 'api-audits-staging' },
  { key: 'b', label: 'Back', action: 'statusMenu' }
];

const testMenu = [
  {
    key: '1',
    label: 'Run E2E Tests',
    description: 'Start Docker Compose E2E test infrastructure and run tests.\nManages test containers lifecycle.',
    script: 'test-e2e.sh'
  },
  {
    key: '2',
    label: 'Test Email Flow',
    description: 'Tests the complete email invitation flow.\nTriggers an invitation batch and polls SendGrid metrics.',
    script: 'test-email-flow.sh',
    argPrompt: 'Arguments (ORG_ID PORTFOLIO_ID JWT): '
  },
  { key: 'b', label: 'Back to Main Menu', action: 'mainMenu' }
];

const utilsMenu = [
  {
    key: '1',
    label: 'Generate Test JWT',
    description: 'Generate a test JWT token for local development.\nIncludes standard user permissions.',
    script: 'generate-test-jwt.js',
    argPrompt: 'User ID and Org ID (space-separated): '
  },
  {
    key: '2',
    label: 'Setup Audits Infrastructure',
    description: 'Creates audits_db database and related secrets.\nRun this before deploying api-audits for the first time.',
    script: 'setup-audits-staging.sh'
  },
  {
    key: '3',
    label: 'Setup Load Balancer',
    description: 'Creates/updates the Global External Load Balancer for staging.\nConfigures SSL certs, backend services, and URL routing.\nRun after adding new services or changing route prefixes.',
    script: 'setup-load-balancer-staging.sh'
  },
  {
    key: '4',
    label: 'GCP Login',
    description: 'Authenticate with GCP for both gcloud CLI and Application Default Credentials.\nRun this if you get authentication errors.',
    command: `gcloud auth login && gcloud auth application-default login && gcloud config set project ${PROJECT_ID} && echo "" && echo "Logged in and project set to ${PROJECT_ID}"`
  },
  { key: 'b', label: 'Back to Main Menu', action: 'mainMenu' }
];

// =============================================================================
// UI HELPERS
// =============================================================================

const clearScreen = () => {
  console.clear();
  console.log(`${colors.cyan}${colors.bright}
  __      __   _      _
  \\ \\    / /__| |____(_)__ _  _ _ _ ___ _ _
   \\ \\/\\/ / -_) '_/ _ \\ / _ || '_| / _ \\ ' \\
    \\_/\\_/\\___|_| \\___/_\\___||_| |_\\___/_||_|
           Verichron Operations CLI
  ${colors.reset}`);
  console.log(`${colors.gray}Project: ${PROJECT_ID}${colors.reset}\n`);
};

const showDescription = (item) => {
  console.log(`\n${colors.cyan}--- ${item.label} ---${colors.reset}`);
  if (item.description) {
    console.log(`${colors.gray}${item.description}${colors.reset}`);
  }
  console.log('');
};

const confirmAction = async (item) => {
  showDescription(item);

  if (item.destructive) {
    console.log(`${colors.red}${colors.bright}WARNING: This is a DESTRUCTIVE operation!${colors.reset}`);
    console.log(`${colors.red}Data will be permanently deleted.${colors.reset}\n`);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(`${colors.yellow}Proceed? (y/n): ${colors.reset}`, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
};

const waitForEnter = () => {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`\n${colors.gray}Press ENTER to continue...${colors.reset}`, () => {
      rl.close();
      resolve();
    });
  });
};

// =============================================================================
// EXECUTION HELPERS
// =============================================================================

const runCommand = (command, args = []) => {
  return new Promise((resolve) => {
    console.log(`\n${colors.green}> ${command} ${args.join(' ')}${colors.reset}\n`);

    const child = spawn(command, args, { stdio: 'inherit', shell: true });

    child.on('close', (code) => {
      if (code !== 0) {
        console.log(`\n${colors.red}Process exited with code ${code}${colors.reset}`);
      }
      resolve();
    });
  });
};

const runScript = async (scriptName, promptArgs = null, fixedArgs = []) => {
  let args = [...fixedArgs];

  if (promptArgs) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise(resolve => {
      rl.question(`${colors.cyan}${promptArgs}${colors.reset}`, (answer) => {
        args = [...args, ...answer.split(' ').filter(a => a)];
        rl.close();
        resolve();
      });
    });
  }

  const scriptPath = path.join(scriptsDir, scriptName);

  // Determine if it's node or bash
  let cmd = scriptPath;
  if (scriptName.endsWith('.js')) {
    cmd = 'node';
    args = [scriptPath, ...args];
  }

  await runCommand(cmd, args);
};

// =============================================================================
// MENU ENGINE
// =============================================================================

const showMenu = async (menuItems, title = '') => {
  clearScreen();

  if (title) {
    console.log(`${colors.bright}${title}${colors.reset}\n`);
  }

  menuItems.forEach(item => {
    const keyStyle = item.action === 'exit' || item.key === 'b'
      ? colors.gray
      : item.destructive
        ? colors.red
        : colors.green;

    const labelStyle = item.destructive ? colors.red : colors.reset;

    console.log(`${keyStyle}[${item.key}]${colors.reset} ${labelStyle}${item.label}${colors.reset}`);
  });

  console.log('');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question(`${colors.bright}Select option: ${colors.reset}`, async (key) => {
    rl.close();

    const selected = menuItems.find(item => item.key === key.toLowerCase());

    if (!selected) {
      await showMenu(menuItems, title);
      return;
    }

    // Handle exit
    if (selected.action === 'exit') {
      console.log('\nGoodbye!\n');
      process.exit(0);
    }

    // Handle navigation to submenus
    if (selected.action && typeof selected.action === 'string') {
      switch (selected.action) {
        case 'deployMenu': await showMenu(deployMenu, 'Deployments'); break;
        case 'dbMenu': await showMenu(dbMenu, 'Database'); break;
        case 'seedMenu': await showMenu(seedMenu, 'Seeding'); break;
        case 'secretsMenu': await showMenu(secretsMenu, 'Secrets Management'); break;
        case 'statusMenu': await showMenu(statusMenu, 'Monitoring & Status'); break;
        case 'logsMenu': await showMenu(logsMenu, 'View Service Logs'); break;
        case 'testMenu': await showMenu(testMenu, 'Testing'); break;
        case 'utilsMenu': await showMenu(utilsMenu, 'Utilities'); break;
        case 'mainMenu': await showMenu(mainMenu); break;
      }
      return;
    }

    // Handle logs viewer
    if (selected.logs) {
      showDescription({ label: `Logs: ${selected.logs}`, description: 'Fetching last 200 log entries...' });
      const logsCommand = `gcloud run services logs read ${selected.logs} --region=${REGION} --project=${PROJECT_ID} --limit=200`;
      await runCommand(logsCommand);
      await waitForEnter();
      await showMenu(menuItems, title);
      return;
    }

    // Handle script execution
    if (selected.script) {
      // Show confirmation for destructive operations
      if (selected.destructive) {
        const proceed = await confirmAction(selected);
        if (!proceed) {
          console.log('\nOperation cancelled.');
          await waitForEnter();
          await showMenu(menuItems, title);
          return;
        }
      } else if (selected.description) {
        // Show description for non-destructive operations
        showDescription(selected);
      }

      await runScript(selected.script, selected.argPrompt, selected.args || []);
      await waitForEnter();
      await showMenu(menuItems, title);
      return;
    }

    // Handle direct commands
    if (selected.command) {
      if (selected.description) {
        showDescription(selected);
      }
      await runCommand(selected.command);
      await waitForEnter();
      await showMenu(menuItems, title);
      return;
    }
  });
};

// =============================================================================
// MAIN
// =============================================================================

showMenu(mainMenu);
