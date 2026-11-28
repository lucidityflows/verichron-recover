import * as dotenv from 'dotenv';
import * as path from 'path';
import { createHealthCheckHelper } from '../helpers/health-check.helper';

export default async function globalSetup() {
  console.log('\n🚀 Setting up E2E test environment...\n');

  dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

  // Override URLs for host-to-container communication
  process.env.E2E_API_USERS_URL = 'http://localhost:3001';
  process.env.E2E_API_ORGANIZATIONS_URL = 'http://localhost:3002';
  process.env.E2E_API_DEBTS_URL = 'http://localhost:3003';
  process.env.E2E_API_DEBTORS_URL = 'http://localhost:3004';
  process.env.E2E_API_TRANSACTIONS_URL = 'http://localhost:3005';
  process.env.E2E_API_COMMUNICATIONS_URL = 'http://localhost:3006';
  process.env.E2E_API_COLLECTORS_URL = 'http://localhost:3007';
  process.env.E2E_API_VOICE_URL = 'http://localhost:3008';
  process.env.E2E_API_WORKFLOWS_URL = 'http://localhost:3009';
  process.env.E2E_API_AUTOMATIONS_URL = 'http://localhost:3010';
  process.env.E2E_API_ANALYTICS_URL = 'http://localhost:3011';

  // Override infra hosts for host-to-container communication
  process.env.DB_HOST = 'localhost';
  process.env.REDIS_HOST = 'localhost';
  process.env.PUBSUB_EMULATOR_HOST = 'localhost:8085';

  const healthCheck = createHealthCheckHelper();

  try {
    const infrastructure = await healthCheck.checkInfrastructure();
    const allHealthy = infrastructure.every(s => s.healthy);

    if (!allHealthy) {
      console.error('❌ Infrastructure not healthy. Please run: pnpm e2e setup');
      process.exit(1);
    }

    console.log('✅ Infrastructure is healthy\n');

    console.log('✅ Jest global setup complete. Databases and topics should be ready.\n');
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error);
    process.exit(1);
  }
}