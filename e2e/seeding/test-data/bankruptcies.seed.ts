import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { log } from '../../helpers/logger';
import { BankruptcyChapter, BankruptcyStatus } from '@verichron/enums';

/**
 * Seed Bankruptcy Filings
 *
 * Creates bankruptcy case records for FDCPA compliance testing.
 * CRITICAL: Automatic stay enforcement - collection must cease immediately upon filing.
 *
 * Bankruptcy types:
 * - Chapter 7: Liquidation (most common for individuals)
 * - Chapter 11: Business reorganization (rare for consumer debt)
 * - Chapter 13: Wage earner plan (repayment over 3-5 years)
 *
 * Status lifecycle: FILED → PENDING → DISCHARGED/DISMISSED/CONVERTED
 */

interface DebtorMap {
  [organizationId: string]: Array<{
    debtorId: string;
    debtIds: string[];
  }>;
}

export async function seedBankruptcies(
  transactionsDataSource: DataSource,
  organizations: Array<{ id: string; name: string }>,
  debtorMap: DebtorMap,
): Promise<void> {
  for (const org of organizations) {
    log(`  -> Seeding bankruptcy filings for ${org.name}...`, 'cyan');

    const debtors = debtorMap[org.id] || [];
    let bankruptcyCount = 0;

    // Create bankruptcies for ~5% of debtors (realistic bankruptcy filing rate)
    for (const debtor of debtors) {
      // 5% probability of bankruptcy
      if (Math.random() < 0.05) {
        const filingDate = new Date();
        filingDate.setMonth(filingDate.getMonth() - Math.floor(Math.random() * 18)); // 0-18 months ago

        // Chapter distribution: 65% Ch7, 30% Ch13, 5% Ch11
        const chapterRoll = Math.random();
        let chapter: BankruptcyChapter;
        if (chapterRoll < 0.65) {
          chapter = BankruptcyChapter.CHAPTER_7;
        } else if (chapterRoll < 0.95) {
          chapter = BankruptcyChapter.CHAPTER_13;
        } else {
          chapter = BankruptcyChapter.CHAPTER_11;
        }

        // Status distribution: 30% filed, 20% pending, 35% discharged, 10% dismissed, 5% converted
        const statusRoll = Math.random();
        let status: BankruptcyStatus;
        let dischargeDate: Date | null = null;
        let dismissalDate: Date | null = null;
        let caseClosedDate: Date | null = null;
        let debtDischarged = false;

        if (statusRoll < 0.30) {
          status = BankruptcyStatus.FILED;
        } else if (statusRoll < 0.50) {
          status = BankruptcyStatus.PENDING;
        } else if (statusRoll < 0.85) {
          status = BankruptcyStatus.DISCHARGED;
          dischargeDate = new Date(filingDate.getTime() + (90 + Math.random() * 90) * 24 * 60 * 60 * 1000); // 90-180 days after filing
          caseClosedDate = new Date(dischargeDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after discharge
          debtDischarged = true;
        } else if (statusRoll < 0.95) {
          status = BankruptcyStatus.DISMISSED;
          dismissalDate = new Date(filingDate.getTime() + (60 + Math.random() * 60) * 24 * 60 * 60 * 1000); // 60-120 days after filing
          caseClosedDate = dismissalDate;
        } else {
          status = BankruptcyStatus.CONVERTED;
        }

        // Case number format: YY-XXXXX (year - 5 digits)
        const year = filingDate.getFullYear().toString().slice(-2);
        const caseNumber = `${year}-${Math.floor(10000 + Math.random() * 90000)}`;

        // Court district (realistic distribution)
        const districts = [
          'C.D. Cal.', // Central District of California
          'S.D.N.Y.', // Southern District of New York
          'N.D. Tex.', // Northern District of Texas
          'N.D. Ill.', // Northern District of Illinois
          'S.D. Fla.', // Southern District of Florida
        ];
        const courtDistrict = districts[Math.floor(Math.random() * districts.length)];

        // Meeting of creditors (341 meeting) - typically 20-40 days after filing
        const meetingOfCreditorsDate = new Date(filingDate.getTime() + (20 + Math.random() * 20) * 24 * 60 * 60 * 1000);

        // Proof of claim deadline - typically 70-90 days after filing
        const proofOfClaimDeadline = new Date(filingDate.getTime() + (70 + Math.random() * 20) * 24 * 60 * 60 * 1000);

        // Attorney info (50% have attorney)
        const hasAttorney = Math.random() < 0.50;
        const attorneyNames = [
          'Smith & Associates',
          'Johnson Law Group',
          'Miller Bankruptcy Law',
          'Davis & Partners',
          'Wilson Legal Services',
        ];
        const attorneyName = hasAttorney ? attorneyNames[Math.floor(Math.random() * attorneyNames.length)] : null;
        const attorneyPhone = hasAttorney ? `(${Math.floor(100 + Math.random() * 900)}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}` : null;
        const attorneyEmail = hasAttorney ? `info@${attorneyName?.toLowerCase().replace(/ /g, '').replace(/&/g, '')}.com` : null;

        // Debt included in schedules (80% yes)
        const debtIncludedInSchedules = Math.random() < 0.80;

        // Proof of claim filed (40% of eligible cases)
        const proofOfClaimFiled = status !== BankruptcyStatus.DISMISSED && Math.random() < 0.40;
        const proofOfClaimFiledDate = proofOfClaimFiled ? new Date(meetingOfCreditorsDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

        // Judge and trustee names
        const judgeNames = ['Hon. Sarah Martinez', 'Hon. Michael Chen', 'Hon. Jennifer Williams', 'Hon. Robert Johnson'];
        const trusteeNames = ['Jane Trustee', 'John Trustee', 'Maria Trustee', 'David Trustee'];

        const bankruptcyId = crypto.randomUUID();

        // For some cases, link to specific debt (80% probability)
        const debtId = Math.random() < 0.80 && debtor.debtIds.length > 0
          ? debtor.debtIds[Math.floor(Math.random() * debtor.debtIds.length)]
          : null;

        await transactionsDataSource.query(
          `
          INSERT INTO bankruptcy_filings (
            id,
            organization_id,
            debtor_profile_id,
            debt_id,
            chapter,
            status,
            case_number,
            court_district,
            filing_date,
            judge_name,
            trustee_name,
            meeting_of_creditors_date,
            proof_of_claim_deadline,
            attorney_name,
            attorney_phone,
            attorney_email,
            debt_included_in_schedules,
            proof_of_claim_filed,
            proof_of_claim_filed_date,
            debt_discharged,
            discharge_date,
            dismissal_date,
            case_closed_date,
            notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
          ON CONFLICT (id) DO NOTHING
          `,
          [
            bankruptcyId,
            org.id,
            debtor.debtorId,
            debtId,
            chapter,
            status,
            caseNumber,
            courtDistrict,
            filingDate,
            judgeNames[Math.floor(Math.random() * judgeNames.length)],
            trusteeNames[Math.floor(Math.random() * trusteeNames.length)],
            meetingOfCreditorsDate,
            proofOfClaimDeadline,
            attorneyName,
            attorneyPhone,
            attorneyEmail,
            debtIncludedInSchedules,
            proofOfClaimFiled,
            proofOfClaimFiledDate,
            debtDischarged,
            dischargeDate,
            dismissalDate,
            caseClosedDate,
            `Test bankruptcy filing - ${chapter} ${status}`,
          ],
        );

        bankruptcyCount++;
      }
    }

    log(`  ✅ Seeded ${bankruptcyCount} bankruptcy filings for ${org.name}`, 'green');
  }
}
