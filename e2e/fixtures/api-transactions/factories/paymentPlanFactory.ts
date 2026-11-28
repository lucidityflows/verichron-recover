import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

/**
 * PaymentPlanFactory
 *
 * Factory for creating PaymentPlan entities and associated PaymentPlanDebt records.
 * Supports creating plans with various statuses, frequencies, and debt consolidation.
 */

export type PaymentPlanStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'COMPLETED' | 'CANCELED' | 'DEFAULTED';
export type PaymentFrequency = 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';

export interface CreatePaymentPlanOptions {
  organizationId: string;
  debtorId: string;
  collectorUserId?: string | null;
  totalAmount?: number;
  numberOfInstallments?: number;
  frequency?: PaymentFrequency;
  status?: PaymentPlanStatus;
  startDate?: Date;
  paymentMethodToken?: string;
  createdByUserId?: string;
  approvedByUserId?: string;
  approvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface PaymentPlan {
  id: string;
  organizationId: string;
  debtorId: string;
  collectorUserId: string | null;
  status: PaymentPlanStatus;
  totalAmount: number;
  numberOfInstallments: number;
  installmentAmount: number;
  frequency: PaymentFrequency;
  startDate: Date;
  nextPaymentDate: Date;
  lastPaymentDate: Date | null;
  paymentMethodToken: string;
  paymentsCompleted: number;
  paymentsFailed: number;
  createdByUserId: string;
  approvedByUserId: string | null;
  approvedAt: Date | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentPlanDebt {
  id: string;
  paymentPlanId: string;
  debtId: string;
  debtBalanceAtCreation: number;
  createdAt: Date;
}

export class PaymentPlanFactory {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Create a payment plan
   *
   * @example
   * ```typescript
   * const plan = await planFactory.createPaymentPlan({
   *   organizationId: org.id,
   *   debtorId: debtor.id,
   *   totalAmount: 1500.00,
   *   numberOfInstallments: 12,
   * });
   * ```
   */
  async createPaymentPlan(options: CreatePaymentPlanOptions): Promise<PaymentPlan> {
    const totalAmount = options.totalAmount || parseFloat(faker.finance.amount({ min: 500, max: 10000, dec: 2 }));
    const numberOfInstallments = options.numberOfInstallments || 12;
    const installmentAmount = parseFloat((totalAmount / numberOfInstallments).toFixed(2));
    const frequency = options.frequency || 'MONTHLY';
    const status = options.status || 'DRAFT';
    const startDate = options.startDate || new Date();
    const nextPaymentDate = new Date(startDate);
    const paymentMethodToken = options.paymentMethodToken || `tok_${uuidv4()}`;
    const createdByUserId = options.createdByUserId || uuidv4();
    const collectorUserId = options.collectorUserId !== undefined ? options.collectorUserId : null;
    const approvedByUserId = options.approvedByUserId || null;
    const approvedAt = options.approvedAt || null;
    const metadata = options.metadata || null;

    const result = await this.dataSource.query(
      `
      INSERT INTO payment_plan (
        organization_id,
        debtor_id,
        collector_user_id,
        status,
        total_amount,
        number_of_installments,
        installment_amount,
        frequency,
        start_date,
        next_payment_date,
        payment_method_token,
        payments_completed,
        payments_failed,
        created_by_user_id,
        approved_by_user_id,
        approved_at,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
      `,
      [
        options.organizationId,
        options.debtorId,
        collectorUserId,
        status,
        totalAmount,
        numberOfInstallments,
        installmentAmount,
        frequency,
        startDate,
        nextPaymentDate,
        paymentMethodToken,
        0, // payments_completed
        0, // payments_failed
        createdByUserId,
        approvedByUserId,
        approvedAt,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );

    return this.mapPlan(result[0]);
  }

  /**
   * Create a draft payment plan (default state)
   *
   * @example
   * ```typescript
   * const plan = await planFactory.createDraftPlan({
   *   organizationId: org.id,
   *   debtorId: debtor.id,
   * });
   * ```
   */
  async createDraftPlan(options: Omit<CreatePaymentPlanOptions, 'status'>): Promise<PaymentPlan> {
    return this.createPaymentPlan({ ...options, status: 'DRAFT' });
  }

  /**
   * Create an active payment plan
   *
   * @example
   * ```typescript
   * const plan = await planFactory.createActivePlan({
   *   organizationId: org.id,
   *   debtorId: debtor.id,
   *   approvedByUserId: admin.id,
   * });
   * ```
   */
  async createActivePlan(options: Omit<CreatePaymentPlanOptions, 'status'>): Promise<PaymentPlan> {
    return this.createPaymentPlan({
      ...options,
      status: 'ACTIVE',
      approvedAt: new Date(),
    });
  }

  /**
   * Create a completed payment plan
   *
   * @example
   * ```typescript
   * const plan = await planFactory.createCompletedPlan({
   *   organizationId: org.id,
   *   debtorId: debtor.id,
   * });
   * ```
   */
  async createCompletedPlan(options: Omit<CreatePaymentPlanOptions, 'status'>): Promise<PaymentPlan> {
    const plan = await this.createPaymentPlan({
      ...options,
      status: 'COMPLETED',
      approvedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
    });

    // Update to show all payments completed
    await this.dataSource.query(
      `
      UPDATE payment_plan
      SET payments_completed = number_of_installments
      WHERE id = $1
      `,
      [plan.id],
    );

    return this.getPaymentPlanById(plan.id);
  }

  /**
   * Link a debt to a payment plan
   *
   * @example
   * ```typescript
   * const planDebt = await planFactory.linkDebtToPlan({
   *   paymentPlanId: plan.id,
   *   debtId: debt.id,
   *   debtBalanceAtCreation: 1000.00,
   * });
   * ```
   */
  async linkDebtToPlan(options: {
    paymentPlanId: string;
    debtId: string;
    debtBalanceAtCreation: number;
  }): Promise<PaymentPlanDebt> {
    const result = await this.dataSource.query(
      `
      INSERT INTO payment_plan_debt (
        payment_plan_id,
        debt_id,
        debt_balance_at_creation
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [options.paymentPlanId, options.debtId, options.debtBalanceAtCreation],
    );

    return this.mapPlanDebt(result[0]);
  }

  /**
   * Create payment plan with linked debts (consolidation)
   *
   * @example
   * ```typescript
   * const result = await planFactory.createPaymentPlanWithDebts({
   *   organizationId: org.id,
   *   debtorId: debtor.id,
   *   debts: [
   *     { debtId: debt1.id, balance: 500.00 },
   *     { debtId: debt2.id, balance: 700.00 },
   *   ],
   * });
   * ```
   */
  async createPaymentPlanWithDebts(options: {
    organizationId: string;
    debtorId: string;
    debts: Array<{ debtId: string; balance: number }>;
    numberOfInstallments?: number;
    frequency?: PaymentFrequency;
    status?: PaymentPlanStatus;
    collectorUserId?: string | null;
  }): Promise<{ plan: PaymentPlan; planDebts: PaymentPlanDebt[] }> {
    // Calculate total from all debts
    const totalAmount = options.debts.reduce((sum, debt) => sum + debt.balance, 0);

    // Create the plan
    const plan = await this.createPaymentPlan({
      organizationId: options.organizationId,
      debtorId: options.debtorId,
      totalAmount,
      numberOfInstallments: options.numberOfInstallments,
      frequency: options.frequency,
      status: options.status,
      collectorUserId: options.collectorUserId,
    });

    // Link all debts to the plan
    const planDebts: PaymentPlanDebt[] = [];
    for (const debt of options.debts) {
      const planDebt = await this.linkDebtToPlan({
        paymentPlanId: plan.id,
        debtId: debt.debtId,
        debtBalanceAtCreation: debt.balance,
      });
      planDebts.push(planDebt);
    }

    return { plan, planDebts };
  }

  /**
   * Get payment plan by ID
   */
  async getPaymentPlanById(id: string): Promise<PaymentPlan> {
    const result = await this.dataSource.query(`SELECT * FROM payment_plan WHERE id = $1`, [id]);
    return this.mapPlan(result[0]);
  }

  /**
   * Maps database result to PaymentPlan type
   */
  private mapPlan(row: any): PaymentPlan {
    return {
      id: row.id,
      organizationId: row.organization_id,
      debtorId: row.debtor_id,
      collectorUserId: row.collector_user_id,
      status: row.status,
      totalAmount: parseFloat(row.total_amount),
      numberOfInstallments: row.number_of_installments,
      installmentAmount: parseFloat(row.installment_amount),
      frequency: row.frequency,
      startDate: row.start_date,
      nextPaymentDate: row.next_payment_date,
      lastPaymentDate: row.last_payment_date,
      paymentMethodToken: row.payment_method_token,
      paymentsCompleted: row.payments_completed,
      paymentsFailed: row.payments_failed,
      createdByUserId: row.created_by_user_id,
      approvedByUserId: row.approved_by_user_id,
      approvedAt: row.approved_at,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Maps database result to PaymentPlanDebt type
   */
  private mapPlanDebt(row: any): PaymentPlanDebt {
    return {
      id: row.id,
      paymentPlanId: row.payment_plan_id,
      debtId: row.debt_id,
      debtBalanceAtCreation: parseFloat(row.debt_balance_at_creation),
      createdAt: row.created_at,
    };
  }
}

/**
 * Factory function to create a PaymentPlanFactory instance
 *
 * @example
 * ```typescript
 * const planFactory = createPaymentPlanFactory(transactionsDataSource);
 * const plan = await planFactory.createActivePlan({ organizationId, debtorId });
 * ```
 */
export function createPaymentPlanFactory(dataSource: DataSource): PaymentPlanFactory {
  return new PaymentPlanFactory(dataSource);
}
