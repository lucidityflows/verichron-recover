/**
 * Test Data: Debtors and Debts
 *
 * Creates debtor users and their associated debts for testing.
 * Enhanced version generates realistic, org-consistent data with:
 * - 50-100 debtors per organization
 * - Status distribution: IN_COLLECTION (60%), PAID (20%), PAYMENT_PLAN (10%), SETTLED (5%), DEFAULTED (5%)
 * - Payment history with transactions
 * - Recent activity for dashboard metrics
 * - Varied dates for trending data
 */

import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import * as crypto from 'crypto';
import {
  DebtStatus,
  DebtorVerificationStatus,
  AddressCategory,
  EmailCategory,
  PhoneCategory,
  Sex,
  Race,
  MaritalStatus,
  PaymentType,
  PaymentStatus,
  PaymentPlanStatus,
  PaymentFrequency,
  PaymentMethod,
  DebtCategory,
  PortfolioStatus,
  StateAbbreviation
} from '@verichron/enums';
import { log } from '../../helpers/logger';
import { TestOrganization } from './organizations.seed';
import { OrgRolesResult } from '../core/org-roles.seed';
import { TEST_USER_PASSWORD } from './org-users.seed';

// ============================================================================
// 🎯 SCALE CONFIGURATION - Adjust these values for different environments
// ============================================================================
//
// Pre-MVP Testing (Current):
//   - 3 portfolios per org × 250 debts = 750 debts per org
//   - Fast rebuild (~10-15 seconds)
//   - Realistic multi-portfolio testing
//
// Demo Deployment (Future):
//   - 3 portfolios per org × 10,000 debts = 30,000 debts per org
//   - Real-world scale portfolios (based on research)
//   - Change DEBTS_PER_PORTFOLIO to 10000
//
// Stress Testing (Horizon):
//   - Increase PORTFOLIOS_PER_ORG to 10+
//   - Test system limits and performance
// ============================================================================

const PORTFOLIO_CONFIG = {
  portfoliosPerOrg: 3,      // Number of portfolios per organization
  debtsPerPortfolio: 250,   // 🚀 Change to 10000 for demo deployment
};

// Debtor configuration (auto-scales based on portfolio size)
const DEBTS_PER_DEBTOR_MIN = 1;
const DEBTS_PER_DEBTOR_MAX = 10;
const DEBTORS_PER_ORG = Math.ceil(
  (PORTFOLIO_CONFIG.portfoliosPerOrg * PORTFOLIO_CONFIG.debtsPerPortfolio) /
  ((DEBTS_PER_DEBTOR_MIN + DEBTS_PER_DEBTOR_MAX) / 2)
);

// Status distribution percentages
const STATUS_DISTRIBUTION = {
  [DebtStatus.IN_COLLECTION]: 0.60,  // 60%
  [DebtStatus.PAID_IN_FULL]: 0.20,   // 20%
  [DebtStatus.PAYMENT_PLAN]: 0.10,   // 10%
  [DebtStatus.SETTLED]: 0.05,        // 5%
  [DebtStatus.CHARGED_OFF]: 0.05,    // 5%
};

interface DebtorConfig {
  email: string;
  firstName: string;
  lastName: string;
  organizations: TestOrganization[];
}

/**
 * Generates a random debt status based on distribution percentages
 */
function getRandomDebtStatus(): DebtStatus {
  const rand = Math.random();
  let cumulative = 0;

  for (const [status, percentage] of Object.entries(STATUS_DISTRIBUTION)) {
    cumulative += percentage;
    if (rand <= cumulative) {
      return status as DebtStatus;
    }
  }

  return DebtStatus.IN_COLLECTION; // Fallback
}

/**
 * Generates a random date within the last N months
 */
function getRandomPastDate(months: number): Date {
  const now = new Date();
  const past = new Date(now);
  past.setMonth(past.getMonth() - months);
  return faker.date.between({ from: past, to: now });
}

/**
 * Determines if an action should happen "today" for dashboard metrics
 * Returns true ~5% of the time to ensure some recent activity
 */
function shouldBeToday(): boolean {
  return Math.random() < 0.05;
}

/**
 * Returns a random payment method with realistic distribution
 */
function getRandomPaymentMethod(): PaymentMethod {
  const rand = Math.random();
  if (rand < 0.35) return PaymentMethod.VISA;
  if (rand < 0.60) return PaymentMethod.MASTERCARD;
  if (rand < 0.70) return PaymentMethod.ACH;
  if (rand < 0.80) return PaymentMethod.AMEX;
  if (rand < 0.85) return PaymentMethod.DISCOVER;
  if (rand < 0.90) return PaymentMethod.CHECK;
  if (rand < 0.95) return PaymentMethod.MONEY_ORDER;
  return PaymentMethod.CASH;
}

async function createDebtorUser(
  config: DebtorConfig,
  orgRoles: OrgRolesResult[],
  usersDataSource: DataSource
): Promise<{ id: string; email: string }> {
  const passwordHash = await bcrypt.hash(TEST_USER_PASSWORD, 10);

  // Find or create debtor user
  let user = await usersDataSource.query(
    `SELECT id, email FROM users WHERE email = $1`,
    [config.email]
  );

  if (!user || user.length === 0) {
    const result = await usersDataSource.query(
      `INSERT INTO users (email, first_name, last_name, middle_name, suffix, password_hash, status, invitation_token, invitation_expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, NULL, $4, $5, NULL, NULL, NOW(), NOW())
       RETURNING id, email`,
      [config.email, config.firstName, config.lastName, passwordHash, 'ACTIVE']
    );
    user = result[0];
  } else {
    user = user[0];
  }

  // Create debtor memberships in each organization
  for (let i = 0; i < config.organizations.length; i++) {
    const org = config.organizations[i];
    const roles = orgRoles[i];

    const existingMembership = await usersDataSource.query(
      `SELECT 1 FROM user_memberships WHERE user_id = $1 AND organization_id = $2`,
      [user.id, org.id]
    );

    if (!existingMembership || existingMembership.length === 0) {
      await usersDataSource.query(
        `INSERT INTO user_memberships (user_id, organization_id, organization_name, role_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [user.id, org.id, org.name, roles.debtor.id]
      );
    }
  }

  return user;
}

async function findOrCreateDebtorWithProfile(
  userId: string,
  firstName: string,
  lastName: string,
  organizationId: string,
  debtorsDataSource: DataSource,
  primaryCollectorId?: string
): Promise<{ debtorProfileId: string; state: StateAbbreviation }> {
  // 1. Find or Create DebtorIdentity
  let identity = await debtorsDataSource.query(
    `SELECT id FROM debtor_identities WHERE user_id = $1`,
    [userId]
  );

  if (!identity || identity.length === 0) {
    const identityResult = await debtorsDataSource.query(
      `INSERT INTO debtor_identities (user_id, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id`,
      [userId]
    );
    identity = identityResult[0];
  } else {
    identity = identity[0];
  }
  const debtorIdentityId = identity.id;

  // 2. Find or Create DebtorProfile
  let profile = await debtorsDataSource.query(
    `SELECT id FROM debtor_profiles WHERE debtor_identity_id = $1 AND organization_id = $2`,
    [debtorIdentityId, organizationId]
  );

  let state: StateAbbreviation;

  if (!profile || profile.length === 0) {
    const profileResult = await debtorsDataSource.query(
      `INSERT INTO debtor_profiles (debtor_identity_id, organization_id, first_name, last_name, verification_status, primary_collector_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
      [debtorIdentityId, organizationId, firstName, lastName, DebtorVerificationStatus.UNVERIFIED, primaryCollectorId || null]
    );
    profile = profileResult[0];
    const debtorProfileId = profile.id;

    // 3. Seed contact info for the new profile
    state = faker.helpers.arrayElement(Object.values(StateAbbreviation));

    await debtorsDataSource.query(
      `INSERT INTO debtor_emails (debtor_profile_id, email, email_category, is_primary, is_verified) VALUES ($1, $2, $3, $4, $5)`,
      [debtorProfileId, `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`, EmailCategory.GENERAL, true, true]
    );
    await debtorsDataSource.query(
      `INSERT INTO debtor_addresses (debtor_profile_id, address_category, street1, city, state, postal_code, country, is_primary, is_current, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [debtorProfileId, AddressCategory.RESIDENCE_PRIMARY, faker.location.streetAddress(), faker.location.city(), state, faker.location.zipCode(), 'US', true, true, true]
    );
    // Generate a simple 10-digit US phone number (normalized format)
    const phoneNumber = faker.string.numeric(10);
    await debtorsDataSource.query(
      `INSERT INTO debtor_phones (debtor_profile_id, phone_number, category, is_primary, is_verified, can_receive_sms) VALUES ($1, $2, $3, $4, $5, $6)`,
      [debtorProfileId, phoneNumber, PhoneCategory.MOBILE, true, true, true]
    );
    await debtorsDataSource.query(
      `INSERT INTO debtor_demographics (debtor_profile_id, sex, race, marital_status) VALUES ($1, $2, $3, $4)`,
      [debtorProfileId, Sex.MALE, Race.WHITE, MaritalStatus.SINGLE]
    );
  } else {
    profile = profile[0];
    // Fetch existing state
    const address = await debtorsDataSource.query(
      `SELECT state FROM debtor_addresses WHERE debtor_profile_id = $1 AND is_primary = true`,
      [profile.id]
    );
    state = address[0]?.state as StateAbbreviation || StateAbbreviation.NY;
  }

  return { debtorProfileId: profile.id, state };
}

interface PortfolioConfig {
  organizationId: string;
  name: string;
  purchaseDate: Date;
  source: string;
  primaryDebtCategory: DebtCategory;
  portfolioTags: string[];
  businessDescription: string;
}

async function createPortfolio(
  config: PortfolioConfig,
  debtsDataSource: DataSource
): Promise<{ id: string; name: string; primary_debt_category: DebtCategory }> {
  let portfolio = await debtsDataSource.query(
    `SELECT id, name, primary_debt_category FROM portfolios WHERE name = $1 AND organization_id = $2`,
    [config.name, config.organizationId]
  );

  if (!portfolio || portfolio.length === 0) {
    const result = await debtsDataSource.query(
      `INSERT INTO portfolios (
        organization_id, name, purchase_date, purchase_price, total_principal, source,
        status, primary_debt_category, portfolio_tags, business_description,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id, name, primary_debt_category`,
      [
        config.organizationId,
        config.name,
        config.purchaseDate,
        0, // purchase_price (updated later)
        0, // total_principal (updated later)
        config.source,
        PortfolioStatus.ACTIVE,
        config.primaryDebtCategory,
        config.portfolioTags,
        config.businessDescription,
      ]
    );
    portfolio = result[0];
  } else {
    portfolio = portfolio[0];
  }

  return portfolio;
}

/**
 * Updates portfolio totals after all debts have been created
 */
async function updatePortfolioTotals(
  portfolioId: string,
  debtsDataSource: DataSource
) {
  // Calculate total principal from all debts in this portfolio
  const result = await debtsDataSource.query(
    `SELECT SUM(CAST(principal_amount AS DECIMAL)) as total_principal
     FROM debts
     WHERE portfolio_id = $1`,
    [portfolioId]
  );

  const totalPrincipal = parseFloat(result[0]?.total_principal || '0');
  // Purchase price is typically 5-10% of face value in debt collection
  const purchasePrice = parseFloat((totalPrincipal * 0.05).toFixed(2));

  await debtsDataSource.query(
    `UPDATE portfolios
     SET total_principal = $1, purchase_price = $2, updated_at = NOW()
     WHERE id = $3`,
    [totalPrincipal.toFixed(2), purchasePrice, portfolioId]
  );
}

/**
 * Creates a debt with realistic status and associated payment history
 */
async function createDebt(
  debtorProfileId: string,
  organizationId: string,
  portfolioId: string,
  principalAmount: string,
  originalDebtDate: Date,
  debtCategory: DebtCategory,
  debtsDataSource: DataSource,
  transactionsDataSource: DataSource,
  collectors: Array<{ userId: string; organizationId: string; name: string }>,
  creditors: Array<{ id: string; legalName: string }>
) {
  const status = getRandomDebtStatus();
  const principal = parseFloat(principalAmount);

  // Calculate current balance based on status
  let currentBalance = principal;
  let paymentsToCreate: number = 0;

  if (status === DebtStatus.PAID_IN_FULL) {
    currentBalance = 0;
    paymentsToCreate = faker.number.int({ min: 1, max: 5 }); // 1-5 payments to reach paid
  } else if (status === DebtStatus.SETTLED) {
    // Settled for 40-70% of principal
    currentBalance = 0;
    paymentsToCreate = 1; // Single settlement payment
  } else if (status === DebtStatus.PAYMENT_PLAN || status === DebtStatus.IN_COLLECTION) {
    // Partial payments (15-40% recovery rate)
    const recoveryRate = faker.number.float({ min: 0.15, max: 0.40, fractionDigits: 2 });
    const amountPaid = principal * recoveryRate;
    currentBalance = principal - amountPaid;
    paymentsToCreate = faker.number.int({ min: 0, max: 3 }); // 0-3 partial payments
  }

  // Randomly assign a creditor from the available creditors
  const randomCreditor = creditors[Math.floor(Math.random() * creditors.length)];
  const creditorId = randomCreditor.id;
  const originalCreditorName = randomCreditor.legalName;

  // Create the debt
  const debtResult = await debtsDataSource.query(
    `INSERT INTO debts (organization_id, portfolio_id, principal_amount, original_debt_date, original_creditor_name, creditor_id, status, debt_category, created_at, updated_at, current_balance, account_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9, $10)
     RETURNING id`,
    [organizationId, portfolioId, principal.toFixed(2), originalDebtDate, originalCreditorName, creditorId, status, debtCategory, currentBalance.toFixed(2), faker.finance.accountNumber()]
  );
  const debtId = debtResult[0].id;

  // Link debt to debtor
  await debtsDataSource.query(
    `INSERT INTO debt_debtor (debt_id, debtor_profile_id, created_at)
     VALUES ($1, $2, NOW())`,
    [debtId, debtorProfileId]
  );

  // Create payment history if applicable
  if (paymentsToCreate > 0) {
    const totalPaid = principal - currentBalance;

    for (let i = 0; i < paymentsToCreate; i++) {
      let paymentAmount: number;

      if (status === DebtStatus.SETTLED && i === 0) {
        // Settlement is a single payment for 40-70% of principal
        paymentAmount = totalPaid;
      } else if (i === paymentsToCreate - 1) {
        // Last payment gets the remaining balance
        const alreadyPaid = (totalPaid / paymentsToCreate) * i;
        paymentAmount = totalPaid - alreadyPaid;
      } else {
        // Distribute payments evenly
        paymentAmount = totalPaid / paymentsToCreate;
      }

      // Determine payment date (should some be today for dashboard metrics?)
      const isToday = shouldBeToday();
      const paymentDate = isToday ? new Date() : getRandomPastDate(12);
      const paymentMethod = getRandomPaymentMethod();

      // Assign transaction to a collector from this organization
      const orgCollectors = collectors.filter(c => c.organizationId === organizationId);
      const collectorUserId = orgCollectors.length > 0
        ? orgCollectors[Math.floor(Math.random() * orgCollectors.length)].userId
        : null;

      await transactionsDataSource.query(
        `INSERT INTO transaction_history (
          organization_id, debt_id, debtor_id, amount, type, status,
          payment_method_token, payment_method_type, gateway_transaction_id, idempotency_key,
          collector_user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)`,
        [
          organizationId,
          debtId,
          debtorProfileId,
          paymentAmount.toFixed(2),
          PaymentType.PAYMENT,
          PaymentStatus.SUCCEEDED,
          `tok_${crypto.randomUUID().substring(0, 20)}`,
          paymentMethod,
          `ch_${crypto.randomUUID().substring(0, 24)}`,
          crypto.randomUUID(),
          collectorUserId,
          paymentDate
        ]
      );
    }
  }

  // Create payment plan if status is PAYMENT_PLAN
  if (status === DebtStatus.PAYMENT_PLAN) {
    const remainingBalance = currentBalance;
    const numberOfInstallments = faker.number.int({ min: 6, max: 24 });
    const installmentAmount = remainingBalance / numberOfInstallments;
    const frequency = faker.helpers.arrayElement([
      PaymentFrequency.WEEKLY,
      PaymentFrequency.BI_WEEKLY,
      PaymentFrequency.MONTHLY
    ]);

    // Start date is either today (for recent activity) or in the past
    const startDate = shouldBeToday() ? new Date() : getRandomPastDate(6);
    const nextPaymentDate = new Date(startDate);

    // Calculate next payment date based on frequency
    switch (frequency) {
      case PaymentFrequency.WEEKLY:
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
        break;
      case PaymentFrequency.BI_WEEKLY:
        nextPaymentDate.setDate(nextPaymentDate.getDate() + 14);
        break;
      case PaymentFrequency.MONTHLY:
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        break;
    }

    await transactionsDataSource.query(
      `INSERT INTO payment_plan (
        organization_id, debtor_id, status, total_amount, number_of_installments,
        installment_amount, frequency, start_date, next_payment_date,
        payment_method_token, payments_completed, payments_failed,
        created_by_user_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)`,
      [
        organizationId,
        debtorProfileId,
        PaymentPlanStatus.ACTIVE,
        remainingBalance.toFixed(2),
        numberOfInstallments,
        installmentAmount.toFixed(2),
        frequency,
        startDate,
        nextPaymentDate,
        `tok_${crypto.randomUUID().substring(0, 20)}`,
        0, // payments_completed
        0, // payments_failed
        debtorProfileId, // created_by_user_id (debtor created it)
        startDate
      ]
    );
  }

  return debtId;
}

/**
 * Seeds debtors and debts for a single organization across multiple portfolios
 * Distributes debts evenly across all portfolios to maintain org-consistency
 * Returns debtor information for work queue seeding
 */
async function seedDebtorsForOrg(
  org: { org: TestOrganization; roles: OrgRolesResult },
  portfolios: { id: string; name: string; primary_debt_category: DebtCategory }[],
  usersDataSource: DataSource,
  debtorsDataSource: DataSource,
  debtsDataSource: DataSource,
  transactionsDataSource: DataSource,
  collectors: Array<{ userId: string; organizationId: string; name: string }>,
  creditors: Array<{ id: string; legalName: string }>
): Promise<DebtorInfo[]> {
  let totalDebtsCreated = 0;
  const debtsPerPortfolio = PORTFOLIO_CONFIG.debtsPerPortfolio;
  const debtorInfoList: DebtorInfo[] = [];

  // Track debts created per portfolio to ensure even distribution
  const portfolioDebtCounts = portfolios.map(() => 0);

  for (let i = 0; i < DEBTORS_PER_ORG; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@${org.org.name.toLowerCase().replace(/\s+/g, '-')}-test.com`;

    const debtorUser = await createDebtorUser(
      {
        email,
        firstName,
        lastName,
        organizations: [org.org],
      },
      [org.roles],
      usersDataSource
    );

    // Pick a random collector from the organization to be the sticky owner
    const orgCollectors = collectors.filter(c => c.organizationId === org.org.id);
    const primaryCollector = orgCollectors.length > 0
        ? orgCollectors[Math.floor(Math.random() * orgCollectors.length)]
        : null;

    const { debtorProfileId, state } = await findOrCreateDebtorWithProfile(
      debtorUser.id,
      firstName,
      lastName,
      org.org.id,
      debtorsDataSource,
      primaryCollector?.userId
    );

    // Create 1-10 debts per debtor, distributed across portfolios
    const debtCount = faker.number.int({ min: DEBTS_PER_DEBTOR_MIN, max: DEBTS_PER_DEBTOR_MAX });
    const debtIds: string[] = [];

    for (let j = 0; j < debtCount; j++) {
      // Find portfolio with least debts to maintain even distribution
      const portfolioIndex = portfolioDebtCounts.indexOf(Math.min(...portfolioDebtCounts));

      // Stop if we've hit the target for all portfolios
      if (portfolioDebtCounts[portfolioIndex] >= debtsPerPortfolio) {
        break;
      }

      const portfolio = portfolios[portfolioIndex];
      const principalAmount = faker.finance.amount({ min: 100, max: 10000, dec: 2 });
      const originalDebtDate = getRandomPastDate(36); // Debts up to 3 years old

      const debtId = await createDebt(
        debtorProfileId,
        org.org.id,
        portfolio.id,
        principalAmount,
        originalDebtDate,
        portfolio.primary_debt_category,
        debtsDataSource,
        transactionsDataSource,
        collectors,
        creditors
      );

      debtIds.push(debtId);
      portfolioDebtCounts[portfolioIndex]++;
      totalDebtsCreated++;
    }

    // Query debts for this debtor to get current balance and days overdue
    const debts = await debtsDataSource.query(
      `SELECT d.id, d.current_balance,
        CASE
          WHEN d.status = 'IN_COLLECTION' THEN GREATEST(0, EXTRACT(DAY FROM (NOW() - d.original_debt_date))::INTEGER)
          ELSE 0
        END as days_overdue
       FROM debts d
       INNER JOIN debt_debtor dd ON d.id = dd.debt_id
       WHERE dd.debtor_profile_id = $1`,
      [debtorProfileId]
    );

    // Add debtor info to list
    debtorInfoList.push({
      id: debtorProfileId,
      name: `${firstName} ${lastName}`,
      state,
      debts: debts.map((d: any) => ({
        id: d.id,
        currentBalance: parseFloat(d.current_balance),
        daysOverdue: parseInt(d.days_overdue, 10),
      })),
    });

    // Progress indicator every 10 debtors
    if ((i + 1) % 10 === 0) {
      log(`      • Processed ${i + 1}/${DEBTORS_PER_ORG} debtors (${totalDebtsCreated} debts created)...`, 'reset');
    }

    // Stop creating debtors if all portfolios are full
    if (portfolioDebtCounts.every(count => count >= debtsPerPortfolio)) {
      log(`      • All portfolios filled (${totalDebtsCreated} total debts), stopping debtor creation`, 'reset');
      break;
    }
  }

  log(`    ✅ Created ${totalDebtsCreated} debts across ${portfolios.length} portfolios for ${org.org.name}`, 'green');

  // Update portfolio totals
  log(`    📊 Updating portfolio totals for ${org.org.name}...`, 'reset');
  for (const portfolio of portfolios) {
    await updatePortfolioTotals(portfolio.id, debtsDataSource);
  }
  log(`    ✅ Portfolio totals updated`, 'reset');

  return debtorInfoList;
}

/**
 * Portfolio templates for org-consistent, realistic test data
 * Each organization gets 3 portfolios representing different quarters
 */
function getPortfolioTemplates(orgId: string, orgName: string): PortfolioConfig[] {
  return [
    {
      organizationId: orgId,
      name: `${orgName} Q2-2024 Portfolio`,
      purchaseDate: new Date('2024-06-15'),
      source: 'Triton Financial Solutions',
      primaryDebtCategory: DebtCategory.MEDICAL,
      portfolioTags: ['Q2-2024', 'Broker-Triton', 'Medical-Mix'],
      businessDescription: 'Mixed medical consumer portfolio. Focus on accounts under $10k. Purchased at 15% of face value.',
    },
    {
      organizationId: orgId,
      name: `${orgName} Q3-2024 Portfolio`,
      purchaseDate: new Date('2024-07-15'),
      source: 'EverChain Capital',
      primaryDebtCategory: DebtCategory.AUTO_LOAN,
      portfolioTags: ['Q3-2024', 'Broker-EverChain', 'Auto-Mix'],
      businessDescription: 'Auto loan deficiency portfolio. Mix of repossessed and voluntary surrenders. Purchased at 14.6% of face value.',
    },
    {
      organizationId: orgId,
      name: `${orgName} Q4-2024 Portfolio`,
      purchaseDate: new Date('2024-10-01'),
      source: 'Triton Financial Solutions',
      primaryDebtCategory: DebtCategory.CREDIT_CARD,
      portfolioTags: ['Q4-2024', 'Broker-Triton', 'Credit-Card-Mix'],
      businessDescription: 'Mixed credit card portfolio from major issuers. Purchased at 15% of face value.',
    },
  ];
}

export interface DebtorInfo {
  id: string;
  name: string;
  state?: StateAbbreviation;
  debts: Array<{ id: string; currentBalance: number; daysOverdue: number }>;
}

export async function seedTestDebtors(
  organizations: {
    org: TestOrganization;
    roles: OrgRolesResult;
  }[],
  usersDataSource: DataSource,
  debtorsDataSource: DataSource,
  debtsDataSource: DataSource,
  transactionsDataSource: DataSource,
  collectors: Array<{ userId: string; organizationId: string; name: string }>,
  creditorMap: Map<string, Array<{ id: string; legalName: string }>>
): Promise<Map<string, DebtorInfo[]>> {
  log('  💳 Creating enhanced debtor test data...', 'cyan');
  log(`    📊 Configuration: ${PORTFOLIO_CONFIG.portfoliosPerOrg} portfolios × ${PORTFOLIO_CONFIG.debtsPerPortfolio} debts = ${PORTFOLIO_CONFIG.portfoliosPerOrg * PORTFOLIO_CONFIG.debtsPerPortfolio} debts per org`, 'cyan');

  const starkOrg = organizations.find(o => o.org.name === 'Stark Industries')!;
  const wayneOrg = organizations.find(o => o.org.name === 'Wayne Enterprises')!;

  // Create portfolios for each organization
  const starkPortfolios = await Promise.all(
    getPortfolioTemplates(starkOrg.org.id, 'Stark').map(config =>
      createPortfolio(config, debtsDataSource)
    )
  );

  const waynePortfolios = await Promise.all(
    getPortfolioTemplates(wayneOrg.org.id, 'Wayne').map(config =>
      createPortfolio(config, debtsDataSource)
    )
  );

  log(`    ✅ Created ${PORTFOLIO_CONFIG.portfoliosPerOrg} portfolios per organization (Q2, Q3, Q4 2024)`, 'reset');

  // Create map to collect debtor info
  const debtorMap = new Map<string, DebtorInfo[]>();

  // Seed debtors and debts for Stark Industries
  log(`    📊 Seeding ${DEBTORS_PER_ORG} debtors for Stark Industries...`, 'reset');
  const starkCreditors = creditorMap.get(starkOrg.org.id) || [];
  const starkDebtors = await seedDebtorsForOrg(
    starkOrg,
    starkPortfolios,
    usersDataSource,
    debtorsDataSource,
    debtsDataSource,
    transactionsDataSource,
    collectors,
    starkCreditors
  );
  debtorMap.set(starkOrg.org.id, starkDebtors);

  // Seed debtors and debts for Wayne Enterprises
  log(`    📊 Seeding ${DEBTORS_PER_ORG} debtors for Wayne Enterprises...`, 'reset');
  const wayneCreditors = creditorMap.get(wayneOrg.org.id) || [];
  const wayneDebtors = await seedDebtorsForOrg(
    wayneOrg,
    waynePortfolios,
    usersDataSource,
    debtorsDataSource,
    debtsDataSource,
    transactionsDataSource,
    collectors,
    wayneCreditors
  );
  debtorMap.set(wayneOrg.org.id, wayneDebtors);

  // ========== SEED PRIMARY TEST DEBTOR (FOR TELEPHONY) ==========
  if (process.env.TEST_DEBTOR_PHONE) {
    const starkPrimary = await seedPrimaryTestDebtor(
      starkOrg,
      starkPortfolios[0],
      usersDataSource,
      debtorsDataSource,
      debtsDataSource,
      transactionsDataSource,
      collectors,
      starkCreditors
    );
    if (starkPrimary) debtorMap.get(starkOrg.org.id)!.unshift(starkPrimary);

    const waynePrimary = await seedPrimaryTestDebtor(
      wayneOrg,
      waynePortfolios[0],
      usersDataSource,
      debtorsDataSource,
      debtsDataSource,
      transactionsDataSource,
      collectors,
      wayneCreditors
    );
    if (waynePrimary) debtorMap.get(wayneOrg.org.id)!.unshift(waynePrimary);
  }

  log('  ✅ Enhanced debtor test data complete', 'green');
  log('    • Status distribution: IN_COLLECTION (60%), PAID_IN_FULL (20%), PAYMENT_PLAN (10%), SETTLED (5%), CHARGED_OFF (5%)', 'reset');
  log('    • Payment history created for paid/partial debts', 'reset');
  log('    • Payment plans created for active plans', 'reset');
  log('    • Recent activity (today) included for dashboard metrics', 'reset');

  return debtorMap;
}

/**
 * Creates a primary test debtor with a real phone number for testing telephony.
 * Guaranteed to have a high priority score.
 */
export async function seedPrimaryTestDebtor(
  org: { org: TestOrganization; roles: OrgRolesResult },
  portfolio: { id: string; name: string; primary_debt_category: DebtCategory },
  usersDataSource: DataSource,
  debtorsDataSource: DataSource,
  debtsDataSource: DataSource,
  transactionsDataSource: DataSource,
  collectors: Array<{ userId: string; organizationId: string; name: string }>,
  creditors: Array<{ id: string; legalName: string }>
): Promise<DebtorInfo | null> {
  const testPhone = process.env.TEST_DEBTOR_PHONE;
  if (!testPhone) return null;

  log(`    📱 Seeding Primary Test Debtor for ${org.org.name}...`, 'cyan');

  const firstName = 'Test';
  const lastName = 'Primary';
  const email = `test.primary@${org.org.name.toLowerCase().replace(/\s+/g, '-')}-test.com`;

  const debtorUser = await createDebtorUser(
    {
      email,
      firstName,
      lastName,
      organizations: [org.org],
    },
    [org.roles],
    usersDataSource
  );

  // Pick first collector as primary
  const orgCollectors = collectors.filter(c => c.organizationId === org.org.id);
  const primaryCollectorId = orgCollectors[0]?.userId;

  const { debtorProfileId, state } = await findOrCreateDebtorWithProfile(
    debtorUser.id,
    firstName,
    lastName,
    org.org.id,
    debtorsDataSource,
    primaryCollectorId
  );

  // Override phone with real test phone
  // Clean phone number (strip non-digits)
  const cleanPhone = testPhone.replace(/\D/g, '');
  await debtorsDataSource.query(
    `UPDATE debtor_phones SET phone_number = $1 WHERE debtor_profile_id = $2 AND is_primary = true`,
    [cleanPhone, debtorProfileId]
  );

  // Create one large debt
  const debtId = await createDebt(
    debtorProfileId,
    org.org.id,
    portfolio.id,
    '15000.00',
    new Date(), // Today (Urgent)
    portfolio.primary_debt_category,
    debtsDataSource,
    transactionsDataSource,
    collectors,
    creditors
  );

  // Manually insert into work_queue_items with MAX priority
  // This bypasses the normal async prioritization for the test seeder
  const workQueueId = crypto.randomUUID();
  await debtsDataSource.query(
    `INSERT INTO work_queue_items (
      id, organization_id, debtor_id, debtor_name, total_balance, days_overdue,
      priority_score, priority_label, status, assigned_to_user_id, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    ON CONFLICT (organization_id, debtor_id) DO UPDATE SET 
      priority_score = 100, 
      priority_label = 'URGENT',
      total_balance = $5`,
    [
      workQueueId, 
      org.org.id, 
      debtorProfileId, 
      `${firstName} ${lastName}`, 
      15000.00, 
      0, 
      100, 
      'URGENT', 
      'NEW', 
      primaryCollectorId
    ]
  );

  return {
    id: debtorProfileId,
    name: `${firstName} ${lastName}`,
    state,
    debts: [{ id: debtId, currentBalance: 15000.00, daysOverdue: 0 }]
  };
}

