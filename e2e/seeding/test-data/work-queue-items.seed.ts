import { DataSource } from 'typeorm';
import { log } from '../../helpers/logger';
import { createCollectorsFixture } from '../../fixtures';
import { ActionType, WorkQueueItemStatus } from '@verichron/enums';
import { faker } from '@faker-js/faker';
import { DebtorInfo } from './debtors.seed';

interface OrgInfo {
  id: string;
  name: string;
}

/**
 * Seeds work queue items based on existing debtors and their debts.
 */
export async function seedWorkQueueItems(
  workQueuesDataSource: DataSource,
  orgs: OrgInfo[],
  debtorMap: Map<string, DebtorInfo[]>
) {
  log('  -> Seeding work queue items...', 'cyan');

  const collectorsFixture = createCollectorsFixture(workQueuesDataSource);
  await collectorsFixture.clean();

  let totalItemsCreated = 0;

  for (const org of orgs) {
    const debtors = debtorMap.get(org.id) || [];
    let orgItemsCreated = 0;

    for (const debtor of debtors) {
      if (debtor.debts.length === 0) continue;

      // For simplicity, we'll create one work queue item per debtor,
      // representing the aggregate of their debts.
      const totalBalance = debtor.debts.reduce((sum, debt) => sum + debt.currentBalance, 0);
      const maxDaysOverdue = Math.max(...debtor.debts.map(d => d.daysOverdue));
      const hasPaymentPlan = Math.random() > 0.8; // 20% chance of having a payment plan

      await collectorsFixture.create({
        organizationId: org.id,
        debtorId: debtor.id,
        debtorName: debtor.name,
        totalBalance: totalBalance,
        daysOverdue: maxDaysOverdue,
        hasPaymentPlan,
        // Add more realistic overrides based on data if needed
      });
      orgItemsCreated++;
    }
    totalItemsCreated += orgItemsCreated;
    log(`    - Created ${orgItemsCreated} work queue items for ${org.name}`, 'reset');
  }

  log(`  ✅ Seeded a total of ${totalItemsCreated} work queue items.`, 'green');
}
