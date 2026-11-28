import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { log } from '../../helpers/logger';
import { ChargeOffReason } from '@verichron/enums';

/**
 * Seed Charge-Off History
 *
 * Creates charge-off history records for debts that have been written off.
 * Supports multiple charge-offs per debt (rare but possible scenarios).
 *
 * Charge-offs typically occur at 180 days delinquent for most creditors.
 */

interface DebtorMap {
  [organizationId: string]: Array<{
    debtorId: string;
    debtIds: string[];
  }>;
}

export async function seedChargeOffs(
  debtsDataSource: DataSource,
  organizations: Array<{ id: string; name: string }>,
  debtorMap: DebtorMap,
): Promise<void> {
  for (const org of organizations) {
    log(`  -> Seeding charge-offs for ${org.name}...`, 'cyan');

    const debtors = debtorMap[org.id] || [];
    let chargeOffCount = 0;

    // Create charge-offs for ~15% of debts (typical charge-off rate in collections)
    for (const debtor of debtors) {
      for (const debtId of debtor.debtIds) {
        // 15% probability of charge-off
        if (Math.random() < 0.15) {
          const chargeOffDate = new Date();
          chargeOffDate.setMonth(chargeOffDate.getMonth() - Math.floor(Math.random() * 12)); // 0-12 months ago

          const reason = [
            ChargeOffReason.DELINQUENCY_180_DAYS,
            ChargeOffReason.BANKRUPTCY,
            ChargeOffReason.DECEASED,
            ChargeOffReason.UNCOLLECTIBLE,
            ChargeOffReason.SETTLEMENT_WRITE_OFF,
          ][Math.floor(Math.random() * 5)];

          const principalBalance = 1000 + Math.random() * 9000; // $1k-$10k
          const interestBalance = principalBalance * (Math.random() * 0.15); // 0-15% interest
          const feesBalance = 50 + Math.random() * 200; // $50-$250 fees
          const totalChargedOff = principalBalance + interestBalance + feesBalance;

          // 30% of charge-offs have some recovery
          const hasRecovery = Math.random() < 0.3;
          const recoveredAmount = hasRecovery ? totalChargedOff * (0.1 + Math.random() * 0.4) : 0; // 10-50% recovery
          const recoveredDate = hasRecovery ? new Date(chargeOffDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null; // 30 days after charge-off

          const daysDelinquent = reason === ChargeOffReason.DELINQUENCY_180_DAYS ? 180 + Math.floor(Math.random() * 100) : Math.floor(Math.random() * 180);

          const chargeOffId = crypto.randomUUID();

          await debtsDataSource.query(
            `
            INSERT INTO charge_off_history (
              id,
              organization_id,
              debt_id,
              charge_off_date,
              reason,
              principal_balance,
              interest_balance,
              fees_balance,
              total_charged_off,
              days_delinquent,
              is_reversed,
              reported_to_credit_bureaus,
              credit_bureau_report_date,
              recovered_amount,
              recovered_date,
              notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            ON CONFLICT (id) DO NOTHING
            `,
            [
              chargeOffId,
              org.id,
              debtId,
              chargeOffDate,
              reason,
              principalBalance.toFixed(2),
              interestBalance.toFixed(2),
              feesBalance.toFixed(2),
              totalChargedOff.toFixed(2),
              daysDelinquent,
              false, // not reversed
              true, // reported to credit bureaus
              chargeOffDate, // same date
              hasRecovery ? recoveredAmount.toFixed(2) : null,
              recoveredDate,
              `Test charge-off: ${reason}`,
            ],
          );

          // Update debt entity with charge-off date (denormalized field)
          await debtsDataSource.query(
            `
            UPDATE debts
            SET charge_off_date = $1
            WHERE id = $2
            `,
            [chargeOffDate, debtId],
          );

          chargeOffCount++;
        }
      }
    }

    log(`  ✅ Seeded ${chargeOffCount} charge-off records for ${org.name}`, 'green');
  }
}
