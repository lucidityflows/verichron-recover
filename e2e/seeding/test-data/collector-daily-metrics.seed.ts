/**
 * Test Data: Collector Daily Metrics
 *
 * Populates historical daily metrics for collector performance timelines.
 * Generates 30 days of data for each collector to test time-series charts.
 */

import { DataSource } from 'typeorm';
import { log } from '../../helpers/logger';

export async function seedCollectorDailyMetrics(
  collectorsDataSource: DataSource,
  userMap: Record<string, Array<{ id: string; email: string }>>
) {
  log('  📈 Seeding collector daily metrics (history)...', 'cyan');

  const today = new Date();
  
  for (const orgId of Object.keys(userMap)) {
    const orgUsers = userMap[orgId];
    const collectors = orgUsers.filter(u => u.email.includes('collector') || u.email.includes('manager') || u.email.includes('tony.stark'));

    for (const collector of collectors) {
      log(`    → Generating 30-day history for ${collector.email}`, 'reset');
      
      for (let i = 30; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Random but semi-realistic metrics
        const callsMade = Math.floor(Math.random() * 40) + 10;
        const emailsSent = Math.floor(Math.random() * 30) + 5;
        const smsSent = Math.floor(Math.random() * 20) + 2;
        const uniqueContacts = Math.max(callsMade, emailsSent, smsSent) + Math.floor(Math.random() * 10);
        const promises = Math.floor(Math.random() * 8);
        const payments = Math.floor(Math.random() * 5);
        const totalCollected = payments * (Math.floor(Math.random() * 50000) + 10000); // in cents

        await getOrCreateDailyMetric(collectorsDataSource, {
          organizationId: orgId,
          collectorUserId: collector.id,
          date: dateStr,
          callsMade,
          emailsSent,
          smsSent,
          uniqueAccountsContacted: uniqueContacts,
          promisesSecured: promises,
          paymentsReceived: payments,
          totalCollected,
        });
      }
    }
  }

  log('  ✅ Collector daily metrics seeding complete', 'green');
}

interface MetricConfig {
  organizationId: string;
  collectorUserId: string;
  date: string;
  callsMade: number;
  emailsSent: number;
  smsSent: number;
  uniqueAccountsContacted: number;
  promisesSecured: number;
  paymentsReceived: number;
  totalCollected: number;
}

async function getOrCreateDailyMetric(
  dataSource: DataSource,
  config: MetricConfig
) {
  const existing = await dataSource.query(
    `SELECT id FROM collector_daily_metrics 
     WHERE organization_id = $1 AND collector_user_id = $2 AND date = $3`,
    [config.organizationId, config.collectorUserId, config.date]
  );

  if (!existing || existing.length === 0) {
    await dataSource.query(
      `INSERT INTO collector_daily_metrics (
        organization_id, collector_user_id, date, calls_made, emails_sent, 
        sms_sent, unique_accounts_contacted, promises_secured, 
        payments_received, total_collected, created_at, updated_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
      [
        config.organizationId, config.collectorUserId, config.date,
        config.callsMade, config.emailsSent, config.smsSent,
        config.uniqueAccountsContacted, config.promisesSecured,
        config.paymentsReceived, config.totalCollected
      ]
    );
  } else {
    // Optional: Update existing record to match seed data
    await dataSource.query(
      `UPDATE collector_daily_metrics SET 
        calls_made = $1, emails_sent = $2, sms_sent = $3, 
        unique_accounts_contacted = $4, promises_secured = $5, 
        payments_received = $6, total_collected = $7, updated_at = NOW()
       WHERE id = $8`,
      [
        config.callsMade, config.emailsSent, config.smsSent,
        config.uniqueAccountsContacted, config.promisesSecured,
        config.paymentsReceived, config.totalCollected, existing[0].id
      ]
    );
  }
}
