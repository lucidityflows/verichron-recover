import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';
import { PaymentMethod, PaymentType, PaymentStatus } from '@verichron/enums';

/**
 * TransactionHistoryFactory
 *
 * Factory for creating TransactionHistory records.
 * Supports creating various transaction types (payments, refunds) with different statuses.
 * TransactionHistory records are immutable once SUCCEEDED or FAILED.
 */

export interface CreateTransactionOptions {
  organizationId: string;
  debtId?: string;
  paymentPlanId?: string;
  debtorId?: string;
  collectorUserId?: string | null;
  amount: number;
  type?: PaymentType;
  status?: PaymentStatus;
  paymentMethodToken?: string;
  paymentMethodType?: PaymentMethod;
  gatewayTransactionId?: string | null;
  failureReason?: string;
  originalTransactionId?: string;
  metadata?: Record<string, any>;
}

export interface TransactionHistory {
  id: string;
  organizationId: string;
  debtId: string | null;
  paymentPlanId: string | null;
  debtorId: string | null;
  collectorUserId: string | null;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  paymentMethodToken: string;
  paymentMethodType: PaymentMethod;
  gatewayTransactionId: string | null;
  failureReason: string | null;
  idempotencyKey: string;
  originalTransactionId: string | null;
  metadata: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export class TransactionHistoryFactory {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Create a transaction record
   *
   * @example
   * ```typescript
   * const transaction = await txFactory.createTransaction({
   *   organizationId: org.id,
   *   debtId: debt.id,
   *   debtorId: debtor.id,
   *   amount: 150.00,
   *   status: 'SUCCEEDED',
   * });
   * ```
   */
  async createTransaction(options: CreateTransactionOptions): Promise<TransactionHistory> {
    const type = options.type || PaymentType.PAYMENT;
    const status = options.status || PaymentStatus.SUCCEEDED;
    const paymentMethodToken = options.paymentMethodToken || `tok_${uuidv4()}`;
    const paymentMethodType = options.paymentMethodType || this.getRandomPaymentMethod();
    const gatewayTransactionId = options.gatewayTransactionId || (status === PaymentStatus.SUCCEEDED ? `ch_${uuidv4()}` : null);
    const failureReason = options.failureReason || null;
    const idempotencyKey = uuidv4();
    const originalTransactionId = options.originalTransactionId || null;
    const metadata = options.metadata || null;

    const result = await this.dataSource.query(
      `
      INSERT INTO transaction_history (
        organization_id,
        debt_id,
        payment_plan_id,
        debtor_id,
        collector_user_id,
        amount,
        type,
        status,
        payment_method_token,
        payment_method_type,
        gateway_transaction_id,
        failure_reason,
        idempotency_key,
        original_transaction_id,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
      `,
      [
        options.organizationId,
        options.debtId || null,
        options.paymentPlanId || null,
        options.debtorId || null,
        options.collectorUserId || null,
        options.amount,
        type,
        status,
        paymentMethodToken,
        paymentMethodType,
        gatewayTransactionId,
        failureReason,
        idempotencyKey,
        originalTransactionId,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );

    return this.mapTransaction(result[0]);
  }

  /**
   * Returns a random payment method with realistic distribution
   */
  private getRandomPaymentMethod(): PaymentMethod {
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

  /**
   * Create a successful payment transaction
   *
   * @example
   * ```typescript
   * const payment = await txFactory.createSuccessfulPayment({
   *   organizationId: org.id,
   *   debtId: debt.id,
   *   debtorId: debtor.id,
   *   amount: 100.00,
   * });
   * ```
   */
  async createSuccessfulPayment(
    options: Omit<CreateTransactionOptions, 'type' | 'status'>,
  ): Promise<TransactionHistory> {
    return this.createTransaction({
      ...options,
      type: PaymentType.PAYMENT,
      status: PaymentStatus.SUCCEEDED,
      gatewayTransactionId: `ch_${uuidv4()}`,
    });
  }

  /**
   * Create a collector-facilitated payment transaction
   *
   * @example
   * ```typescript
   * const payment = await txFactory.createCollectorFacilitatedPayment({
   *   organizationId: org.id,
   *   debtId: debt.id,
   *   debtorId: debtor.id,
   *   collectorUserId: collector.userId,
   *   amount: 100.00,
   * });
   * ```
   */
  async createCollectorFacilitatedPayment(
    options: Omit<CreateTransactionOptions, 'type' | 'status'> & { collectorUserId: string },
  ): Promise<TransactionHistory> {
    return this.createTransaction({
      ...options,
      type: PaymentType.PAYMENT,
      status: PaymentStatus.SUCCEEDED,
      gatewayTransactionId: `ch_${uuidv4()}`,
    });
  }

  /**
   * Create a failed payment transaction
   *
   * @example
   * ```typescript
   * const failedPayment = await txFactory.createFailedPayment({
   *   organizationId: org.id,
   *   debtId: debt.id,
   *   debtorId: debtor.id,
   *   amount: 100.00,
   *   failureReason: 'Card declined - insufficient funds',
   * });
   * ```
   */
  async createFailedPayment(
    options: Omit<CreateTransactionOptions, 'type' | 'status'>,
  ): Promise<TransactionHistory> {
    const failureReason = options.failureReason || 'Card declined - insufficient funds';

    return this.createTransaction({
      ...options,
      type: PaymentType.PAYMENT,
      status: PaymentStatus.FAILED,
      failureReason,
      gatewayTransactionId: null,
    });
  }

  /**
   * Create a pending payment transaction
   *
   * @example
   * ```typescript
   * const pending = await txFactory.createPendingPayment({
   *   organizationId: org.id,
   *   debtId: debt.id,
   *   debtorId: debtor.id,
   *   amount: 100.00,
   * });
   * ```
   */
  async createPendingPayment(
    options: Omit<CreateTransactionOptions, 'type' | 'status'>,
  ): Promise<TransactionHistory> {
    return this.createTransaction({
      ...options,
      type: PaymentType.PAYMENT,
      status: PaymentStatus.PENDING,
    });
  }

  /**
   * Create a refund transaction for a previous payment
   *
   * @example
   * ```typescript
   * const refund = await txFactory.createRefund({
   *   organizationId: org.id,
   *   debtId: debt.id,
   *   debtorId: debtor.id,
   *   amount: 100.00,
   *   originalTransactionId: originalPayment.id,
   * });
   * ```
   */
  async createRefund(
    options: Omit<CreateTransactionOptions, 'type'> & { originalTransactionId: string },
  ): Promise<TransactionHistory> {
    const status = options.status || PaymentStatus.SUCCEEDED;

    const refund = await this.createTransaction({
      ...options,
      type: PaymentType.REFUND,
      status,
      gatewayTransactionId: status === PaymentStatus.SUCCEEDED ? `re_${uuidv4()}` : null,
    });

    // If refund succeeded, mark original transaction as REFUNDED
    if (status === PaymentStatus.SUCCEEDED) {
      await this.dataSource.query(
        `
        UPDATE transaction_history
        SET status = $1
        WHERE id = $2
        `,
        [PaymentStatus.REFUNDED, options.originalTransactionId],
      );
    }

    return refund;
  }

  /**
   * Create scheduled payment transaction (linked to payment plan)
   *
   * @example
   * ```typescript
   * const scheduledPayment = await txFactory.createScheduledPayment({
   *   organizationId: org.id,
   *   debtId: debt.id,
   *   paymentPlanId: plan.id,
   *   debtorId: debtor.id,
   *   amount: 125.00,
   * });
   * ```
   */
  async createScheduledPayment(
    options: Omit<CreateTransactionOptions, 'type'> & { paymentPlanId: string },
  ): Promise<TransactionHistory> {
    return this.createTransaction({
      ...options,
      type: PaymentType.PAYMENT,
      status: options.status || PaymentStatus.SUCCEEDED,
    });
  }

  /**
   * Create multiple successful payments for a debtor
   *
   * @example
   * ```typescript
   * const payments = await txFactory.createMultiplePayments({
   *   organizationId: org.id,
   *   debtId: debt.id,
   *   debtorId: debtor.id,
   *   count: 5,
   *   amount: 100.00,
   * });
   * ```
   */
  async createMultiplePayments(options: {
    organizationId: string;
    debtId?: string;
    paymentPlanId?: string;
    debtorId?: string;
    count: number;
    amount: number;
  }): Promise<TransactionHistory[]> {
    const transactions: TransactionHistory[] = [];

    for (let i = 0; i < options.count; i++) {
      const tx = await this.createSuccessfulPayment({
        organizationId: options.organizationId,
        debtId: options.debtId,
        paymentPlanId: options.paymentPlanId,
        debtorId: options.debtorId,
        amount: options.amount,
      });
      transactions.push(tx);
    }

    return transactions;
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string): Promise<TransactionHistory> {
    const result = await this.dataSource.query(`SELECT * FROM transaction_history WHERE id = $1`, [id]);
    return this.mapTransaction(result[0]);
  }

  /**
   * Maps database result to TransactionHistory type
   */
  private mapTransaction(row: any): TransactionHistory {
    return {
      id: row.id,
      organizationId: row.organization_id,
      debtId: row.debt_id,
      paymentPlanId: row.payment_plan_id,
      debtorId: row.debtor_id,
      collectorUserId: row.collector_user_id,
      amount: parseFloat(row.amount),
      type: row.type,
      status: row.status,
      paymentMethodToken: row.payment_method_token,
      paymentMethodType: row.payment_method_type,
      gatewayTransactionId: row.gateway_transaction_id,
      failureReason: row.failure_reason,
      idempotencyKey: row.idempotency_key,
      originalTransactionId: row.original_transaction_id,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

/**
 * Factory function to create a TransactionHistoryFactory instance
 *
 * @example
 * ```typescript
 * const txFactory = createTransactionHistoryFactory(transactionsDataSource);
 * const payment = await txFactory.createSuccessfulPayment({ organizationId, debtId, debtorId, amount: 100 });
 * ```
 */
export function createTransactionHistoryFactory(dataSource: DataSource): TransactionHistoryFactory {
  return new TransactionHistoryFactory(dataSource);
}
