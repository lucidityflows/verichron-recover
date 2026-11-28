import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { log } from '../../helpers/logger';
import { SettlementOfferStatus } from '@verichron/enums';

/**
 * Seed Settlement Offers
 *
 * Creates settlement offer records representing debt negotiation history.
 * Supports multiple offers per debt to show full negotiation lifecycle.
 *
 * Settlement scenarios:
 * - Pending offers awaiting debtor response
 * - Accepted offers with payment schedules
 * - Rejected offers (debtor declined)
 * - Completed settlements (paid in full)
 * - Defaulted settlements (missed payments)
 */

interface DebtorMap {
  [organizationId: string]: Array<{
    debtorId: string;
    debtIds: string[];
  }>;
}

interface UserInfo {
  id: string;
  email: string;
}

export async function seedSettlements(
  transactionsDataSource: DataSource,
  organizations: Array<{ id: string; name: string }>,
  debtorMap: DebtorMap,
  userMap: Record<string, UserInfo[]>,
): Promise<void> {
  for (const org of organizations) {
    log(`  -> Seeding settlement offers for ${org.name}...`, 'cyan');

    const debtors = debtorMap[org.id] || [];
    const orgUsers = userMap[org.id] || [];
    const collectors = orgUsers.filter(u => u.email.includes('romanoff') || u.email.includes('stark'));

    let settlementCount = 0;

    // Create settlements for ~20% of debts (typical settlement rate)
    for (const debtor of debtors) {
      for (const debtId of debtor.debtIds) {
        // 20% probability of settlement offer
        if (Math.random() < 0.20) {
          const originalBalance = 5000 + Math.random() * 15000; // $5k-$20k
          const offerDate = new Date();
          offerDate.setMonth(offerDate.getMonth() - Math.floor(Math.random() * 6)); // 0-6 months ago

          // Status distribution: 40% pending, 25% accepted, 15% completed, 10% rejected, 10% defaulted
          const statusRoll = Math.random();
          let status: SettlementOfferStatus;
          let settlementPercentage: number;
          let resolutionDate: Date | null = null;
          let paymentDate: Date | null = null;

          if (statusRoll < 0.40) {
            status = SettlementOfferStatus.PENDING;
            settlementPercentage = 40 + Math.random() * 30; // 40-70% of balance
          } else if (statusRoll < 0.65) {
            status = SettlementOfferStatus.ACCEPTED;
            settlementPercentage = 45 + Math.random() * 25; // 45-70% (better terms when accepted)
            resolutionDate = new Date(offerDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days after offer
          } else if (statusRoll < 0.80) {
            status = SettlementOfferStatus.COMPLETED;
            settlementPercentage = 50 + Math.random() * 20; // 50-70% (paid settlements)
            resolutionDate = new Date(offerDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days after offer
            paymentDate = new Date(resolutionDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days after acceptance
          } else if (statusRoll < 0.90) {
            status = SettlementOfferStatus.REJECTED;
            settlementPercentage = 30 + Math.random() * 20; // 30-50% (debtor rejected low offer)
            resolutionDate = new Date(offerDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days after offer
          } else {
            status = SettlementOfferStatus.DEFAULTED;
            settlementPercentage = 45 + Math.random() * 20; // 45-65% (accepted but defaulted)
            resolutionDate = new Date(offerDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days after offer
          }

          const settlementAmount = originalBalance * (settlementPercentage / 100);

          // Payment structure: 70% lump sum, 30% installment
          const paymentStructure = Math.random() < 0.70 ? 'LUMP_SUM' : 'INSTALLMENT';
          const installmentMonths = paymentStructure === 'INSTALLMENT' ? 3 + Math.floor(Math.random() * 9) : null; // 3-12 months

          // Offered by: 60% creditor, 40% debtor
          const offeredBy = Math.random() < 0.60 ? 'CREDITOR' : 'DEBTOR';

          const collectorUser = collectors.length > 0 ? collectors[Math.floor(Math.random() * collectors.length)] : orgUsers[0];

          const settlementId = crypto.randomUUID();

          // Calculate expiration date (30-60 days from offer for pending/rejected, null for accepted/completed)
          let expirationDate: Date | null = null;
          if (status === SettlementOfferStatus.PENDING || status === SettlementOfferStatus.REJECTED) {
            expirationDate = new Date(offerDate.getTime() + (30 + Math.random() * 30) * 24 * 60 * 60 * 1000);
          }

          await transactionsDataSource.query(
            `
            INSERT INTO settlement_offers (
              id,
              organization_id,
              debt_id,
              offered_by,
              status,
              original_balance,
              settlement_amount,
              settlement_percentage,
              payment_structure,
              installment_count,
              offer_date,
              expiration_date,
              resolution_date,
              resolved_by,
              completion_date,
              notes,
              created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            ON CONFLICT (id) DO NOTHING
            `,
            [
              settlementId,
              org.id,
              debtId,
              offeredBy,
              status,
              originalBalance.toFixed(2),
              settlementAmount.toFixed(2),
              settlementPercentage.toFixed(2),
              paymentStructure,
              installmentMonths,
              offerDate,
              expirationDate,
              resolutionDate,
              resolutionDate ? collectorUser.id : null,
              paymentDate,
              `Test settlement offer - ${status} - ${settlementPercentage.toFixed(0)}% of balance`,
              collectorUser.id,
            ],
          );

          settlementCount++;

          // For some debts, create a negotiation history (multiple offers)
          if (Math.random() < 0.15 && status !== SettlementOfferStatus.PENDING) {
            // Create a prior offer that was rejected
            const priorOfferDate = new Date(offerDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before
            const priorPercentage = 25 + Math.random() * 20; // 25-45% (lower initial offer)
            const priorSettlementAmount = originalBalance * (priorPercentage / 100);

            const priorSettlementId = crypto.randomUUID();

            await transactionsDataSource.query(
              `
              INSERT INTO settlement_offers (
                id,
                organization_id,
                debt_id,
                offered_by,
                status,
                original_balance,
                settlement_amount,
                settlement_percentage,
                payment_structure,
                offer_date,
                expiration_date,
                resolution_date,
                resolved_by,
                notes,
                created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
              ON CONFLICT (id) DO NOTHING
              `,
              [
                priorSettlementId,
                org.id,
                debtId,
                'CREDITOR',
                SettlementOfferStatus.REJECTED,
                originalBalance.toFixed(2),
                priorSettlementAmount.toFixed(2),
                priorPercentage.toFixed(2),
                'LUMP_SUM',
                priorOfferDate,
                new Date(priorOfferDate.getTime() + 45 * 24 * 60 * 60 * 1000),
                new Date(priorOfferDate.getTime() + 5 * 24 * 60 * 60 * 1000),
                collectorUser.id,
                'Test settlement offer - Rejected (led to negotiation)',
                collectorUser.id,
              ],
            );

            settlementCount++;
          }
        }
      }
    }

    log(`  ✅ Seeded ${settlementCount} settlement offers for ${org.name}`, 'green');
  }
}
