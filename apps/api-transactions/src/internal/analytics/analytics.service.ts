import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, SelectQueryBuilder } from 'typeorm';
import { TransactionHistory } from '../../transactions/entities/transaction-history.entity';
import { PaymentPlan } from '../../payment-plans/entities/payment-plan.entity';
import { PaymentPlanDebt } from '../../payment-plans/entities/payment-plan-debt.entity';
import { PaymentStatus, PaymentType, PaymentPlanStatus, TrendGranularity, AnalyticsGroupBy, FlowDimension } from '@verichron/enums';
import {
  RecoveryTrendsInternalQueryDto,
  RecoveryTrendsPaymentResponseDto,
  PaymentPeriodDataDto,
  PortfolioPerformanceInternalQueryDto,
  PortfolioPerformancePaymentResponseDto,
  PortfolioPaymentMetricsDto,
  FlowAnalyticsInternalQueryDto,
  FlowAnalyticsPaymentResponseDto,
  DebtorFocusTransactionsResponseDto,
  DebtorFocusTransactionDto,
  DebtorFocusPaymentPlanDto,
  CollectorPaymentStatsDto,
  OrganizationPaymentStatsDto,
  CollectorDashboardMetricsDto,
} from './dto';

export interface InternalTransactionAnalytics {
  totalCollected: Array<{ year: number; quarter: string; value: number }>;
  todayCollections: number;
  todayPaymentPlans: number;
}

/**
 * Internal Analytics Service for api-transactions
 *
 * Provides aggregated transaction and payment plan metrics for the event orchestrator.
 * This service is only called via internal endpoints, not exposed to external users.
 */
@Injectable()
export class InternalAnalyticsService {
  private readonly logger = new Logger(InternalAnalyticsService.name);

  constructor(
    @InjectRepository(TransactionHistory)
    private readonly transactionRepository: Repository<TransactionHistory>,
    @InjectRepository(PaymentPlan)
    private readonly paymentPlanRepository: Repository<PaymentPlan>,
    @InjectRepository(PaymentPlanDebt)
    private readonly paymentPlanDebtRepository: Repository<PaymentPlanDebt>,
  ) {}

  async getDashboardSummary(organizationId: string, date?: string): Promise<InternalTransactionAnalytics> {
    this.logger.log(`[getDashboardSummary] START - Generating transaction analytics for organization: ${organizationId} for date: ${date || 'today'}`);

    try {
      // Run queries in parallel for performance
      const [collectedByQuarter, todayCollections, todayPaymentPlans] = await Promise.all([
        this.getCollectedByQuarter(organizationId),
        this.getTodayCollections(organizationId, date),
        this.getTodayPaymentPlans(organizationId, date),
      ]);

      this.logger.log(`[getDashboardSummary] Results - collectedByQuarter: ${JSON.stringify(collectedByQuarter)}, todayCollections: ${todayCollections}, todayPaymentPlans: ${todayPaymentPlans}`);

      return {
        totalCollected: collectedByQuarter,
        todayCollections,
        todayPaymentPlans,
      };
    } catch (error) {
      this.logger.error(`[getDashboardSummary] ERROR for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Get recent transactions for an organization
   */
  async getRecentTransactions(
    organizationId: string,
    limit: number = 20,
  ): Promise<any[]> {
    this.logger.log(`Fetching ${limit} recent transactions for org: ${organizationId}`);

    const transactions = await this.transactionRepository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return transactions.map(t => ({
      id: t.id,
      amountCents: Math.round(Number(t.amount) * 100),
      userId: t.collectorUserId,
      debtId: t.debtId,
      createdAt: t.createdAt,
    }));
  }

  /**
   * Get total collected amounts grouped by quarter
   */
  private async getCollectedByQuarter(
    organizationId: string,
  ): Promise<Array<{ year: number; quarter: string; value: number }>> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('EXTRACT(YEAR FROM transaction.created_at)', 'year')
      .addSelect(
        "CONCAT('Q', EXTRACT(QUARTER FROM transaction.created_at))",
        'quarter',
      )
      .addSelect('SUM(CAST(transaction.amount AS DECIMAL))', 'value')
      .where('transaction.organization_id = :organizationId', { organizationId })
      .andWhere('transaction.type = :type', { type: PaymentType.PAYMENT })
      .andWhere('transaction.status = :status', { status: PaymentStatus.SUCCEEDED })
      .groupBy('year')
      .addGroupBy('quarter')
      .orderBy('year', 'DESC')
      .addOrderBy('quarter', 'DESC')
      .limit(8) // Last 2 years of quarters
      .getRawMany();

    return result.map((row) => ({
      year: parseInt(row.year, 10),
      quarter: row.quarter,
      value: parseFloat(row.value || '0'),
    }));
  }

  /**
   * Get total payments collected today (or on a specific date)
   */
  private async getTodayCollections(organizationId: string, date?: string): Promise<number> {
    const startOfDay = date ? new Date(date) : new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = date ? new Date(date) : new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(CAST(transaction.amount AS DECIMAL))', 'total')
      .where('transaction.organization_id = :organizationId', { organizationId })
      .andWhere('transaction.type = :type', { type: PaymentType.PAYMENT })
      .andWhere('transaction.status = :status', { status: PaymentStatus.SUCCEEDED })
      .andWhere('transaction.created_at >= :startOfDay', { startOfDay })
      .andWhere('transaction.created_at <= :endOfDay', { endOfDay })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  /**
   * Get number of payment plans created today (or on a specific date)
   */
  private async getTodayPaymentPlans(organizationId: string, date?: string): Promise<number> {
    const startOfDay = date ? new Date(date) : new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = date ? new Date(date) : new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.paymentPlanRepository.count({
      where: {
        organizationId,
        status: PaymentPlanStatus.ACTIVE,
        createdAt: Between(startOfDay, endOfDay),
      },
    });
  }

  /**
   * Get payment data for recovery trends grouped by period
   */
  async getRecoveryTrends(
    organizationId: string,
    query: RecoveryTrendsInternalQueryDto,
  ): Promise<RecoveryTrendsPaymentResponseDto> {
    this.logger.log(`[getRecoveryTrends] START for org: ${organizationId}`);

    // Add period selection based on granularity
    const periodExpression = this.getPeriodExpression(query.granularity || TrendGranularity.MONTHLY);

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .select(periodExpression, 'period')
      .where('transaction.organizationId = :organizationId', { organizationId })
      .andWhere('transaction.type = :type', { type: PaymentType.PAYMENT })
      .andWhere('transaction.status = :status', { status: PaymentStatus.SUCCEEDED });

    // Apply filters
    this.applyTrendsFilters(queryBuilder, query);

    // Add grouping - Note: Transaction entity doesn't have debt relation,
    // so we can't group by debt category. Portfolio grouping would require
    // joining with api-debts data, which should be done at orchestrator level.
    // For now, we'll skip groupBy for transactions and let orchestrator handle it.

    // Add aggregations
    queryBuilder
      .addSelect('SUM(CAST(transaction.amount AS DECIMAL))', 'totalCollected')
      .addSelect('COUNT(transaction.id)', 'transactionCount')
      .groupBy('period');

    queryBuilder.orderBy('period', 'ASC');

    const results = await queryBuilder.getRawMany();

    const payments: PaymentPeriodDataDto[] = results.map((row) => ({
      period: row.period,
      totalCollected: parseFloat(row.totalCollected || '0').toFixed(2),
      transactionCount: parseInt(row.transactionCount, 10),
      ...(row.groupKey && { groupKey: row.groupKey }),
    }));

    this.logger.log(`[getRecoveryTrends] Found ${payments.length} payment periods`);

    return { payments };
  }

  /**
   * Apply analytics filters to query builder
   * Note: Transaction entity only has debtId as a column, not relations to Debt or Portfolio.
   * Filters like portfolioId, portfolioTag, and debtCategory cannot be applied here
   * and should be handled at the orchestrator level by filtering debt data first.
   */
  private applyTrendsFilters(
    queryBuilder: SelectQueryBuilder<TransactionHistory>,
    query: RecoveryTrendsInternalQueryDto,
  ): void {
    if (query.startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    // Note: portfolioId, portfolioTag, and debtCategory filters are not supported
    // at the transaction service level since we don't have relations to Debt or Portfolio.
    // The orchestrator should filter debt data first, then match transactions to those debts.
  }

  /**
   * Get SQL expression for period grouping based on granularity
   */
  private getPeriodExpression(granularity: TrendGranularity): string {
    switch (granularity) {
      case TrendGranularity.DAILY:
        return "TO_CHAR(transaction.created_at, 'YYYY-MM-DD')";
      case TrendGranularity.WEEKLY:
        return "TO_CHAR(transaction.created_at, 'IYYY-\"W\"IW')";
      case TrendGranularity.MONTHLY:
        return "TO_CHAR(transaction.created_at, 'YYYY-MM')";
      case TrendGranularity.QUARTERLY:
        return "TO_CHAR(transaction.created_at, 'YYYY-\"Q\"Q')";
      case TrendGranularity.YEARLY:
        return "TO_CHAR(transaction.created_at, 'YYYY')";
      default:
        return "TO_CHAR(transaction.created_at, 'YYYY-MM')";
    }
  }

  /**
   * Get portfolio performance payment metrics
   * Returns payment statistics grouped by portfolio
   *
   * Note: Transactions only have debtId, not portfolioId. The orchestrator provides
   * the list of portfolioIds to query, and we'll match transactions by debtId.
   */
  async getPortfolioPerformance(
    organizationId: string,
    query: PortfolioPerformanceInternalQueryDto,
    debtToPortfolioMap: Record<string, string>, // debtId -> portfolioId mapping from orchestrator
  ): Promise<PortfolioPerformancePaymentResponseDto> {
    this.logger.log(`[getPortfolioPerformance] START for org: ${organizationId}`);

    // Get all debt IDs from the mapping
    const debtIds = Object.keys(debtToPortfolioMap);

    if (debtIds.length === 0) {
      this.logger.log(`[getPortfolioPerformance] No debts provided, returning empty result`);
      return { portfolios: [] };
    }

    this.logger.log(`[getPortfolioPerformance] Processing ${debtIds.length} debts`);

    // Build query for successful payments
    const transactionQueryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.organization_id = :organizationId', { organizationId })
      .andWhere('transaction.type = :type', { type: PaymentType.PAYMENT })
      .andWhere('transaction.status = :status', { status: PaymentStatus.SUCCEEDED })
      .andWhere('transaction.debt_id IN (:...debtIds)', { debtIds });

    // Apply time filters
    if (query.startDate) {
      transactionQueryBuilder.andWhere('transaction.created_at >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      transactionQueryBuilder.andWhere('transaction.created_at <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    const transactions = await transactionQueryBuilder.getMany();

    this.logger.log(`[getPortfolioPerformance] Found ${transactions.length} transactions`);

    // Get payment plans for the debts via PaymentPlanDebt join table
    // Note: PaymentPlan entity has debtorId, not debtId. Payment plans link to multiple
    // debts through the PaymentPlanDebt join table.
    const paymentPlanDebtsQueryBuilder = this.paymentPlanDebtRepository
      .createQueryBuilder('ppd')
      .where('ppd.debt_id IN (:...debtIds)', { debtIds });

    const paymentPlanDebts = await paymentPlanDebtsQueryBuilder.getMany();

    this.logger.log(`[getPortfolioPerformance] Found ${paymentPlanDebts.length} payment plan-debt associations`);

    // Group transactions and payment plans by portfolio
    const portfolioMetrics = new Map<string, {
      totalCollected: number;
      paymentPlanCount: number;
      firstPaymentDays: number[];
    }>();

    // Initialize all portfolios
    const uniquePortfolioIds = new Set(Object.values(debtToPortfolioMap));
    uniquePortfolioIds.forEach((portfolioId) => {
      portfolioMetrics.set(portfolioId, {
        totalCollected: 0,
        paymentPlanCount: 0,
        firstPaymentDays: [],
      });
    });

    // Aggregate transaction data
    transactions.forEach((transaction) => {
      if (transaction.debtId) {
        const portfolioId = debtToPortfolioMap[transaction.debtId];
        if (portfolioId) {
          const metrics = portfolioMetrics.get(portfolioId)!;
          metrics.totalCollected += parseFloat(transaction.amount?.toString() || '0');
        }
      }
    });

    // Aggregate payment plan data
    // Track unique payment plans per portfolio to avoid double-counting
    const portfolioPaymentPlans = new Map<string, Set<string>>();

    paymentPlanDebts.forEach((ppd) => {
      if (ppd.debtId) {
        const portfolioId = debtToPortfolioMap[ppd.debtId];
        if (portfolioId) {
          if (!portfolioPaymentPlans.has(portfolioId)) {
            portfolioPaymentPlans.set(portfolioId, new Set());
          }
          portfolioPaymentPlans.get(portfolioId)!.add(ppd.paymentPlanId);
        }
      }
    });

    // Set the unique payment plan counts per portfolio
    portfolioPaymentPlans.forEach((planIds, portfolioId) => {
      const metrics = portfolioMetrics.get(portfolioId);
      if (metrics) {
        metrics.paymentPlanCount = planIds.size;
      }
    });

    // Calculate avgDaysToFirstPayment - would require debt.createdAt from api-debts
    // For now, set to null since we don't have that data here
    // The orchestrator can calculate this if needed

    // Build response
    const portfolios: PortfolioPaymentMetricsDto[] = Array.from(portfolioMetrics.entries()).map(
      ([portfolioId, metrics]) => ({
        portfolioId,
        totalCollected: metrics.totalCollected.toFixed(2),
        paymentPlanCount: metrics.paymentPlanCount,
        avgDaysToFirstPayment: null, // Requires debt createdAt data
      }),
    );

    this.logger.log(`[getPortfolioPerformance] Calculated metrics for ${portfolios.length} portfolios`);

    return { portfolios };
  }

  /**
   * Get payment flow data for Sankey diagrams
   *
   * TODO: PAYMENT_METHOD view requires storing payment method types in the database.
   * Currently, only paymentMethodToken (tokenized reference) is stored.
   * To support PAYMENT_METHOD flow visualization, we need to:
   * 1. Add a payment_method_type column to transaction_history (or create payment_methods table)
   * 2. Store the PaymentMethod enum value (VISA, MASTERCARD, ACH, etc.) when creating transactions
   * 3. Update this method to query by payment_method_type
   *
   * For now, this returns empty results for PAYMENT_METHOD view.
   * Other views (DEBT_CATEGORY, PORTFOLIO, STATE, STATUS_TRANSITION) are handled by other services.
   */
  async getFlowAnalytics(
    organizationId: string,
    query: FlowAnalyticsInternalQueryDto,
  ): Promise<FlowAnalyticsPaymentResponseDto> {
    this.logger.log(`[getFlowAnalytics] START for org: ${organizationId}, view: ${query.view}`);

    if (query.view === FlowDimension.PAYMENT_METHOD) {
      return this.getFlowByPaymentMethod(organizationId, query);
    }

    // All other views (DEBT_CATEGORY, PORTFOLIO, STATE, STATUS_TRANSITION) are handled by other services
    this.logger.log(`[getFlowAnalytics] View ${query.view} not handled by api-transactions`);
    return { paymentsByDimension: [] };
  }

  private async getFlowByPaymentMethod(
    organizationId: string,
    query: FlowAnalyticsInternalQueryDto,
  ): Promise<FlowAnalyticsPaymentResponseDto> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.payment_method_type', 'dimensionValue')
      .addSelect('SUM(CAST(transaction.amount AS DECIMAL))', 'totalAmount')
      .addSelect('COUNT(transaction.id)', 'paymentCount')
      .where('transaction.organization_id = :organizationId', { organizationId })
      .andWhere('transaction.type = :type', { type: PaymentType.PAYMENT })
      .andWhere('transaction.status = :status', { status: PaymentStatus.SUCCEEDED })
      .groupBy('transaction.payment_method_type')
      .orderBy('"totalAmount"', 'DESC');

    // Apply date filters if provided
    if (query.startDate) {
      queryBuilder.andWhere('transaction.created_at >= :startDate', {
        startDate: query.startDate,
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('transaction.created_at <= :endDate', {
        endDate: query.endDate,
      });
    }

    const rawResults = await queryBuilder.getRawMany();

    // Transform results to include labels
    const paymentsByDimension = rawResults.map((item) => ({
      dimensionValue: item.dimensionValue,
      label: this.getPaymentMethodLabel(item.dimensionValue),
      totalAmount: item.totalAmount,
      paymentCount: parseInt(item.paymentCount, 10),
    }));

    this.logger.log(
      `[getFlowByPaymentMethod] Found ${paymentsByDimension.length} payment methods for org ${organizationId}`,
    );

    return { paymentsByDimension };
  }

  /**
   * Returns display label for payment method
   */
  private getPaymentMethodLabel(paymentMethod: string): string {
    const labels: Record<string, string> = {
      VISA: 'Visa',
      MASTERCARD: 'Mastercard',
      AMEX: 'American Express',
      DISCOVER: 'Discover',
      ACH: 'ACH / Bank Transfer',
      MONEY_ORDER: 'Money Order',
      CASH: 'Cash',
      CHECK: 'Check',
      OTHER: 'Other',
    };
    return labels[paymentMethod] || paymentMethod;
  }

  /**
   * Get transaction history and payment plans for a specific debtor
   */
  async getDebtorTransactions(
    organizationId: string,
    debtorProfileId: string,
  ): Promise<DebtorFocusTransactionsResponseDto> {
    this.logger.log(
      `Fetching transactions for debtor: ${debtorProfileId} in organization: ${organizationId}`,
    );

    // Fetch all transactions for this debtor
    const transactions = await this.transactionRepository.find({
      where: {
        organizationId,
        debtorId: debtorProfileId,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    // Fetch all payment plans for this debtor
    const paymentPlans = await this.paymentPlanRepository.find({
      where: {
        organizationId,
        debtorId: debtorProfileId,
      },
      order: {
        createdAt: 'DESC',
      },
    });

    // Map transactions to DTOs
    const transactionDtos: DebtorFocusTransactionDto[] = transactions.map((t) => ({
      transactionId: t.id,
      debtId: t.debtId,
      paymentPlanId: t.paymentPlanId,
      amount: Number(t.amount),
      type: t.type,
      status: t.status,
      paymentMethodType: t.paymentMethodType,
      gatewayTransactionId: t.gatewayTransactionId,
      failureReason: t.failureReason,
      transactionDate: t.createdAt.toISOString(),
    }));

    // Get debt IDs from payment plans to show which debt each plan is for
    // For now, we'll assume single-debt payment plans
    const paymentPlanDtos: DebtorFocusPaymentPlanDto[] = await Promise.all(
      paymentPlans.map(async (plan) => {
        // Get the debts associated with this payment plan
        const planDebts = await this.paymentPlanDebtRepository.find({
          where: { paymentPlanId: plan.id },
        });

        const debtId = planDebts.length > 0 ? planDebts[0].debtId : '';
        const amountPaid = plan.paymentsCompleted * Number(plan.installmentAmount);
        const amountRemaining = Number(plan.totalAmount) - amountPaid;

        // Helper to safely convert date to YYYY-MM-DD string
        const toDateString = (date: any): string | null => {
          if (!date) return null;
          if (typeof date === 'string') {
            // Already a string, just extract YYYY-MM-DD part
            return date.split('T')[0];
          }
          if (date instanceof Date) {
            return date.toISOString().split('T')[0];
          }
          return null;
        };

        return {
          paymentPlanId: plan.id,
          debtId,
          totalAmount: Number(plan.totalAmount),
          amountPaid,
          amountRemaining,
          installmentAmount: Number(plan.installmentAmount),
          totalInstallments: plan.numberOfInstallments,
          completedInstallments: plan.paymentsCompleted,
          status: plan.status,
          nextPaymentDue: toDateString(plan.nextPaymentDate),
          startDate: toDateString(plan.startDate) || '',
        };
      }),
    );

    // Calculate aggregates
    const successfulPayments = transactions.filter(
      (t) =>
        t.type === PaymentType.PAYMENT &&
        t.status === PaymentStatus.SUCCEEDED,
    );
    const failedPayments = transactions.filter(
      (t) =>
        t.type === PaymentType.PAYMENT &&
        t.status === PaymentStatus.FAILED,
    );

    const totalAmountPaid = successfulPayments.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    const lastSuccessfulPayment = successfulPayments[0]; // Already sorted DESC

    return {
      transactions: transactionDtos,
      paymentPlans: paymentPlanDtos,
      totalAmountPaid,
      successfulPaymentCount: successfulPayments.length,
      failedPaymentCount: failedPayments.length,
      lastPaymentDate: lastSuccessfulPayment
        ? lastSuccessfulPayment.createdAt.toISOString().split('T')[0]
        : null,
      lastPaymentAmount: lastSuccessfulPayment
        ? Number(lastSuccessfulPayment.amount)
        : null,
    };
  }

  /**
   * Get payment statistics for a specific collector within a time period
   *
   * Aggregates payment transactions attributed to a collector.
   * Null collectorUserId indicates self-service payments (future ui-debtors portal).
   */
  async getCollectorPaymentStats(
    organizationId: string,
    collectorUserId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<CollectorPaymentStatsDto> {
    this.logger.log(
      `Fetching payment stats for collector: ${collectorUserId} in organization: ${organizationId} from ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
    );

    // Query successful payments facilitated by this collector within the time period
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.organization_id = :organizationId', { organizationId })
      .andWhere('transaction.collector_user_id = :collectorUserId', { collectorUserId })
      .andWhere('transaction.type = :type', { type: PaymentType.PAYMENT })
      .andWhere('transaction.status = :status', { status: PaymentStatus.SUCCEEDED })
      .andWhere('transaction.created_at >= :periodStart', { periodStart })
      .andWhere('transaction.created_at <= :periodEnd', { periodEnd })
      .getMany();

    // Calculate aggregates
    const totalCollected = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    );

    const successfulPaymentCount = transactions.length;

    const uniquePayingAccounts = new Set(
      transactions.map((t) => t.debtorId).filter((id) => id),
    ).size;

    const avgPaymentAmount = successfulPaymentCount > 0
      ? totalCollected / successfulPaymentCount
      : 0;

    const largestPayment = transactions.reduce(
      (max, t) => Math.max(max, Number(t.amount)),
      0,
    );

    // Query payment plans created by this collector in the period
    const paymentPlansCreated = await this.paymentPlanRepository.count({
      where: {
        organizationId,
        collectorUserId,
        createdAt: Between(periodStart, periodEnd),
      },
    });

    return {
      collectorUserId,
      totalCollected: Math.round(totalCollected),
      successfulPaymentCount,
      uniquePayingAccounts,
      paymentPlansCreated,
      avgPaymentAmount: Math.round(avgPaymentAmount),
      largestPayment: Math.round(largestPayment),
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }

  /**
   * Get payment statistics for all collectors in an organization within a time period
   *
   * Aggregates payment transactions grouped by collector
   */
  async getOrganizationPaymentStats(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OrganizationPaymentStatsDto> {
    this.logger.log(
      `Fetching payment stats for all collectors in organization: ${organizationId} from ${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
    );

    // Query all successful payments in the period with a collector assigned
    const transactions = await this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.organization_id = :organizationId', { organizationId })
      .andWhere('transaction.type = :type', { type: PaymentType.PAYMENT })
      .andWhere('transaction.status = :status', { status: PaymentStatus.SUCCEEDED })
      .andWhere('transaction.created_at >= :periodStart', { periodStart })
      .andWhere('transaction.created_at <= :periodEnd', { periodEnd })
      .andWhere('transaction.collector_user_id IS NOT NULL')
      .getMany();

    // Group transactions by collector
    const collectorTransactions = new Map<string, TransactionHistory[]>();

    transactions.forEach((transaction) => {
      if (transaction.collectorUserId) {
        if (!collectorTransactions.has(transaction.collectorUserId)) {
          collectorTransactions.set(transaction.collectorUserId, []);
        }
        collectorTransactions.get(transaction.collectorUserId)!.push(transaction);
      }
    });

    // Query payment plans created by collectors in the period
    const paymentPlans = await this.paymentPlanRepository.find({
      where: {
        organizationId,
        createdAt: Between(periodStart, periodEnd),
      },
    });

    // Group payment plans by collector
    const collectorPaymentPlans = new Map<string, number>();

    paymentPlans.forEach((plan) => {
      if (plan.collectorUserId) {
        const currentCount = collectorPaymentPlans.get(plan.collectorUserId) || 0;
        collectorPaymentPlans.set(plan.collectorUserId, currentCount + 1);
      }
    });

    // Build collector stats
    const collectorStats: CollectorPaymentStatsDto[] = [];

    collectorTransactions.forEach((transactions, collectorUserId) => {
      const totalCollected = transactions.reduce(
        (sum, t) => sum + Number(t.amount),
        0,
      );

      const successfulPaymentCount = transactions.length;

      const uniquePayingAccounts = new Set(
        transactions.map((t) => t.debtorId).filter((id) => id),
      ).size;

      const avgPaymentAmount = successfulPaymentCount > 0
        ? totalCollected / successfulPaymentCount
        : 0;

      const largestPayment = transactions.reduce(
        (max, t) => Math.max(max, Number(t.amount)),
        0,
      );

      const paymentPlansCreated = collectorPaymentPlans.get(collectorUserId) || 0;

      collectorStats.push({
        collectorUserId,
        totalCollected: Math.round(totalCollected),
        successfulPaymentCount,
        uniquePayingAccounts,
        paymentPlansCreated,
        avgPaymentAmount: Math.round(avgPaymentAmount),
        largestPayment: Math.round(largestPayment),
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      });
    });

    // Sort by totalCollected descending
    collectorStats.sort((a, b) => b.totalCollected - a.totalCollected);

    this.logger.log(
      `Found payment stats for ${collectorStats.length} collectors in organization ${organizationId}`,
    );

    return {
      organizationId,
      collectorStats,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
    };
  }

  /**
   * Get dashboard metrics for a collector (period + today in single response)
   *
   * Optimized endpoint that returns both the requested period stats and today's stats
   * in a single call to reduce HTTP overhead for dashboard rendering.
   */
  async getCollectorDashboardMetrics(
    organizationId: string,
    collectorUserId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<CollectorDashboardMetricsDto> {
    this.logger.log(
      `Fetching dashboard metrics for collector: ${collectorUserId} in organization: ${organizationId}`,
    );

    // Calculate today's date range
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Fetch both period stats and today's stats in parallel
    const [periodStats, todayStats] = await Promise.all([
      this.getCollectorPaymentStats(
        organizationId,
        collectorUserId,
        periodStart,
        periodEnd,
      ),
      this.getCollectorPaymentStats(
        organizationId,
        collectorUserId,
        startOfToday,
        endOfToday,
      ),
    ]);

    return {
      collectorUserId,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      // Period metrics
      totalCollected: periodStats.totalCollected,
      successfulPaymentCount: periodStats.successfulPaymentCount,
      uniquePayingAccounts: periodStats.uniquePayingAccounts,
      paymentPlansCreated: periodStats.paymentPlansCreated,
      avgPaymentAmount: periodStats.avgPaymentAmount,
      largestPayment: periodStats.largestPayment,
      // Today's metrics
      totalCollectedToday: todayStats.totalCollected,
      successfulPaymentCountToday: todayStats.successfulPaymentCount,
      uniquePayingAccountsToday: todayStats.uniquePayingAccounts,
      paymentPlansCreatedToday: todayStats.paymentPlansCreated,
    };
  }
}
