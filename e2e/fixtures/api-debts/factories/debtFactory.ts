import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { DebtStatus } from '@verichron/enums';

/**
 * Debt Factory
 *
 * Creates debt test data directly in the api-debts database.
 * Debts represent individual accounts owed by debtors to creditors.
 *
 * Key Design:
 * - Each debt belongs to ONE portfolio and ONE organization
 * - Debts can have multiple debtors (co-debtors) via debt_debtor join table
 * - Financial fields (principal, interest, fees) use DECIMAL for precision
 * - Account numbers must be unique within an organization
 *
 * @example
 * ```typescript
 * const debtFactory = createDebtFactory(debtsDataSource);
 *
 * // Create debt with defaults
 * const debt = await debtFactory.createDebt({
 *   organizationId: org.id,
 *   portfolioId: portfolio.id,
 * });
 *
 * // Create debt for specific debtor (ownership-based testing)
 * const debtorDebt = await debtFactory.createDebtWithDebtor({
 *   organizationId: org.id,
 *   portfolioId: portfolio.id,
 *   debtorId: debtor.id,
 * });
 *
 * // Create debt with custom amounts
 * const customDebt = await debtFactory.createDebt({
 *   organizationId: org.id,
 *   portfolioId: portfolio.id,
 *   principalAmount: '5000.00',
 *   interestAmount: '250.00',
 *   currentBalance: '5250.00',
 *   status: DebtStatus.IN_COLLECTION,
 * });
 * ```
 */

export interface CreateDebtOptions {
  id?: string;
  organizationId: string;
  portfolioId: string;
  creditorId?: string | null;
  originalCreditorName?: string;
  accountNumber?: string;
  principalAmount?: string;
  interestAmount?: string;
  feesAmount?: string;
  currentBalance?: string;
  status?: DebtStatus;
  originalDebtDate?: Date;
  lastPaymentDate?: Date | null;
  firstDelinquencyDate?: Date | null;
  placementDate?: Date | null;
  chargeOffDate?: Date | null;
  lastTransactionDate?: Date | null;
  lastContactDate?: Date | null;
  statuteOfLimitationsDate?: Date | null;
  statuteOfLimitationsState?: string | null;
  importNotes?: string | null;
  importBatchId?: string | null;
  notes?: string | null;
}

export interface Debt {
  id: string;
  organizationId: string;
  portfolioId: string;
  creditorId: string | null;
  originalCreditorName: string;
  accountNumber: string;
  principalAmount: string;
  interestAmount: string;
  feesAmount: string;
  currentBalance: string;
  status: DebtStatus;
  originalDebtDate: Date;
  lastPaymentDate: Date | null;
  firstDelinquencyDate: Date | null;
  placementDate: Date | null;
  chargeOffDate: Date | null;
  lastTransactionDate: Date | null;
  lastContactDate: Date | null;
  statuteOfLimitationsDate: Date | null;
  statuteOfLimitationsState: string | null;
  importNotes: string | null;
  importBatchId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DebtDebtor {
  id: string;
  debtId: string;
  debtorId: string;
  createdAt: Date;
}

export class DebtFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Creates a debt with default test values.
   * Requires organizationId and portfolioId for proper multi-tenancy.
   */
  async createDebt(options: CreateDebtOptions): Promise<Debt> {
    const principal = options.principalAmount || faker.number.int({ min: 500, max: 50000 }).toFixed(2);
    const interest = options.interestAmount || faker.number.int({ min: 0, max: 1000 }).toFixed(2);
    const fees = options.feesAmount || faker.number.int({ min: 0, max: 500 }).toFixed(2);

    // Calculate current balance if not provided
    const calculatedBalance = (
      parseFloat(principal) +
      parseFloat(interest) +
      parseFloat(fees)
    ).toFixed(2);

    const [debt] = await this.dataSource.query(
      `
      INSERT INTO debts (
        id,
        organization_id,
        portfolio_id,
        creditor_id,
        original_creditor_name,
        account_number,
        principal_amount,
        interest_amount,
        fees_amount,
        current_balance,
        status,
        original_debt_date,
        last_payment_date,
        first_delinquency_date,
        placement_date,
        charge_off_date,
        last_transaction_date,
        last_contact_date,
        statute_of_limitations_date,
        statute_of_limitations_state,
        import_notes,
        import_batch_id,
        notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING *
      `,
      [
        options.id || faker.string.uuid(),
        options.organizationId,
        options.portfolioId,
        options.creditorId || null,
        options.originalCreditorName || `${faker.company.name()} ${faker.helpers.arrayElement(['Bank', 'Credit Union', 'Finance Co.'])}`,
        options.accountNumber || `ACC-${faker.string.alphanumeric(12).toUpperCase()}`,
        principal,
        interest,
        fees,
        options.currentBalance || calculatedBalance,
        options.status || DebtStatus.IMPORTED,
        options.originalDebtDate || faker.date.past({ years: 3 }),
        options.lastPaymentDate || null,
        options.firstDelinquencyDate || faker.date.past({ years: 2 }),
        options.placementDate || faker.date.recent({ days: 180 }),
        options.chargeOffDate || null,
        options.lastTransactionDate || null,
        options.lastContactDate || null,
        options.statuteOfLimitationsDate || null,
        options.statuteOfLimitationsState || null,
        options.importNotes || null,
        options.importBatchId || null,
        options.notes || null,
      ],
    );

    return debt;
  }

  /**
   * Creates a debt and links it to a debtor via the debt_debtor join table.
   * This is the most common pattern for debtor access control testing.
   */
  async createDebtWithDebtor(
    options: CreateDebtOptions & { debtorId: string },
  ): Promise<{ debt: Debt; debtDebtor: DebtDebtor }> {
    const debt = await this.createDebt(options);

    const [debtDebtor] = await this.dataSource.query(
      `
      INSERT INTO debt_debtor (
        id,
        debt_id,
        debtor_profile_id
      ) VALUES ($1, $2, $3)
      RETURNING *
      `,
      [faker.string.uuid(), debt.id, options.debtorId],
    );

    return { debt, debtDebtor };
  }

  /**
   * Creates multiple debts for a debtor across different portfolios.
   * Useful for testing multi-org debtor access (TC-DBT-ACCESS-001).
   */
  async createMultipleDebtsForDebtor(
    debtorId: string,
    portfolios: Array<{ organizationId: string; portfolioId: string }>,
    overrides?: Partial<CreateDebtOptions>,
  ): Promise<Array<{ debt: Debt; debtDebtor: DebtDebtor }>> {
    const results: Array<{ debt: Debt; debtDebtor: DebtDebtor }> = [];

    for (const portfolio of portfolios) {
      const result = await this.createDebtWithDebtor({
        organizationId: portfolio.organizationId,
        portfolioId: portfolio.portfolioId,
        debtorId,
        ...overrides,
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Creates a debt in IN_COLLECTION status with recent activity.
   */
  async createActiveDebt(options: Omit<CreateDebtOptions, 'status'>): Promise<Debt> {
    return this.createDebt({
      ...options,
      status: DebtStatus.IN_COLLECTION,
      lastPaymentDate: faker.date.recent({ days: 30 }),
      notes: 'Active collection in progress',
    });
  }

  /**
   * Creates a debt in PAID_IN_FULL status.
   */
  async createPaidDebt(options: Omit<CreateDebtOptions, 'status' | 'currentBalance'>): Promise<Debt> {
    return this.createDebt({
      ...options,
      status: DebtStatus.PAID_IN_FULL,
      currentBalance: '0.00',
      lastPaymentDate: faker.date.recent({ days: 7 }),
      notes: 'Paid in full',
    });
  }

  /**
   * Creates debts for testing ownership isolation.
   * Returns debts owned by different debtors to test that
   * debtor A cannot see debtor B's debts (TC-DBT-ACCESS-002).
   */
  async createDebtsForOwnershipTest(
    organizationId: string,
    portfolioId: string,
    debtorAId: string,
    debtorBId: string,
  ): Promise<{
    debtorADebts: Array<{ debt: Debt; debtDebtor: DebtDebtor }>;
    debtorBDebts: Array<{ debt: Debt; debtDebtor: DebtDebtor }>;
  }> {
    // Create 3 debts for debtor A
    const debtorADebts = await Promise.all([
      this.createDebtWithDebtor({
        organizationId,
        portfolioId,
        debtorId: debtorAId,
        principalAmount: '1000.00',
      }),
      this.createDebtWithDebtor({
        organizationId,
        portfolioId,
        debtorId: debtorAId,
        principalAmount: '2000.00',
      }),
      this.createDebtWithDebtor({
        organizationId,
        portfolioId,
        debtorId: debtorAId,
        principalAmount: '3000.00',
      }),
    ]);

    // Create 2 debts for debtor B
    const debtorBDebts = await Promise.all([
      this.createDebtWithDebtor({
        organizationId,
        portfolioId,
        debtorId: debtorBId,
        principalAmount: '5000.00',
      }),
      this.createDebtWithDebtor({
        organizationId,
        portfolioId,
        debtorId: debtorBId,
        principalAmount: '7500.00',
      }),
    ]);

    return { debtorADebts, debtorBDebts };
  }

  /**
   * Link additional debtor to an existing debt (for co-debtor scenarios).
   */
  async linkDebtorToDebt(debtId: string, debtorId: string): Promise<DebtDebtor> {
    const [debtDebtor] = await this.dataSource.query(
      `
      INSERT INTO debt_debtor (
        id,
        debt_id,
        debtor_profile_id
      ) VALUES ($1, $2, $3)
      RETURNING *
      `,
      [faker.string.uuid(), debtId, debtorId],
    );

    return debtDebtor;
  }
}

/**
 * Factory function to create a DebtFactory instance.
 * Follows the pattern established in other fixture factories.
 */
export function createDebtFactory(dataSource: DataSource): DebtFactory {
  return new DebtFactory(dataSource);
}
