import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Debt } from '../../debts/entities/debt.entity';
import { Portfolio } from '../../portfolios/entities/portfolio.entity';
import { DebtStatus, PortfolioStatus, TrendGranularity, AnalyticsGroupBy, DebtCategory, FlowDimension, StateAbbreviation } from '@verichron/enums';
import {
  RecoveryTrendsInternalQueryDto,
  RecoveryTrendsDebtResponseDto,
  DebtPeriodDataDto,
  PortfolioPerformanceInternalQueryDto,
  PortfolioPerformanceDebtResponseDto,
  PortfolioDebtMetricsDto,
  FlowAnalyticsInternalQueryDto,
  FlowAnalyticsDebtResponseDto,
  FlowDimensionDataDto,
  GeographicDebtsQueryDto,
  GeographicDebtsResponseDto,
  DebtorDebtMetricsDto,
  StateDebtMetricsDto,
  GeographicCreditorsQueryDto,
  GeographicCreditorsResponseDto,
  StateCreditorMetricsDto,
  TopCreditorDto,
  DebtorFocusDebtsResponseDto,
  DebtorFocusDebtDto,
} from './dto';

export interface InternalDebtAnalytics {
  totalPortfolios: number;
  totalDebts: number;
  totalInvested: Array<{ year: number; quarter: string; value: number }>;
  totalOutstanding: number;
  statusCounts: {
    active: number;
    paid: number;
    settled: number;
    defaulted: number;
    paymentPlan: number;
  };
  topPortfolios: Array<{
    id: string;
    name: string;
    recoveryRate: number;
    totalCollected: number;
  }>;
}

/**
 * Internal Analytics Service for api-debts
 *
 * Provides aggregated debt and portfolio metrics for the event orchestrator.
 * This service is only called via internal endpoints, not exposed to external users.
 */
@Injectable()
export class InternalAnalyticsService {
  private readonly logger = new Logger(InternalAnalyticsService.name);

  constructor(
    @InjectRepository(Debt)
    private readonly debtRepository: Repository<Debt>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
  ) {}

  async getDashboardSummary(organizationId: string): Promise<InternalDebtAnalytics> {
    this.logger.log(`Generating dashboard summary for organization: ${organizationId}`);

    // Run queries in parallel for performance
    const [
      totalPortfolios,
      totalDebts,
      totalOutstanding,
      statusCounts,
      investmentByQuarter,
    ] = await Promise.all([
      this.getTotalPortfolios(organizationId),
      this.getTotalDebts(organizationId),
      this.getTotalOutstanding(organizationId),
      this.getStatusCounts(organizationId),
      this.getInvestmentByQuarter(organizationId),
    ]);

    // Top portfolios requires more complex calculation
    const topPortfolios = await this.getTopPortfolios(organizationId);

    return {
      totalPortfolios,
      totalDebts,
      totalInvested: investmentByQuarter,
      totalOutstanding,
      statusCounts,
      topPortfolios,
    };
  }

  private async getTotalPortfolios(organizationId: string): Promise<number> {
    return this.portfolioRepository.count({
      where: {
        organizationId,
        status: PortfolioStatus.ACTIVE,
      },
    });
  }

  private async getTotalDebts(organizationId: string): Promise<number> {
    return this.debtRepository.count({
      where: { organizationId },
    });
  }

  private async getTotalOutstanding(organizationId: string): Promise<number> {
    const result = await this.debtRepository
      .createQueryBuilder('debt')
      .select('SUM(CAST(debt.current_balance AS DECIMAL))', 'total')
      .where('debt.organization_id = :organizationId', { organizationId })
      .andWhere('debt.status NOT IN (:...terminalStatuses)', {
        terminalStatuses: [DebtStatus.PAID_IN_FULL, DebtStatus.SETTLED, DebtStatus.CHARGED_OFF],
      })
      .getRawOne();

    return parseFloat(result?.total || '0');
  }

  private async getStatusCounts(organizationId: string): Promise<{
    active: number;
    paid: number;
    settled: number;
    defaulted: number;
    paymentPlan: number;
  }> {
    const counts = await this.debtRepository
      .createQueryBuilder('debt')
      .select('debt.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('debt.organization_id = :organizationId', { organizationId })
      .groupBy('debt.status')
      .getRawMany();

    const statusMap = counts.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count, 10);
      return acc;
    }, {} as Record<string, number>);

    return {
      active: statusMap[DebtStatus.ACTIVE] || 0,
      paid: statusMap[DebtStatus.PAID_IN_FULL] || 0,
      settled: statusMap[DebtStatus.SETTLED] || 0,
      defaulted: statusMap[DebtStatus.CHARGED_OFF] || 0,
      paymentPlan: statusMap[DebtStatus.PAYMENT_PLAN] || 0,
    };
  }

  private async getInvestmentByQuarter(
    organizationId: string,
  ): Promise<Array<{ year: number; quarter: string; value: number }>> {
    // Get portfolio investments by purchase date quarter
    const result = await this.portfolioRepository
      .createQueryBuilder('portfolio')
      .select('EXTRACT(YEAR FROM portfolio.purchase_date)', 'year')
      .addSelect(
        "CONCAT('Q', EXTRACT(QUARTER FROM portfolio.purchase_date))",
        'quarter',
      )
      .addSelect('SUM(CAST(portfolio.purchase_price AS DECIMAL))', 'value')
      .where('portfolio.organization_id = :organizationId', { organizationId })
      .andWhere('portfolio.status != :status', { status: PortfolioStatus.PROVISIONING })
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

  private async getTopPortfolios(organizationId: string): Promise<
    Array<{
      id: string;
      name: string;
      recoveryRate: number;
      totalCollected: number;
    }>
  > {
    // For now, we'll calculate based on debt status
    // In the future, this should aggregate transaction data from api-transactions
    const portfolios = await this.portfolioRepository
      .createQueryBuilder('portfolio')
      .where('portfolio.organization_id = :organizationId', { organizationId })
      .andWhere('portfolio.status = :status', { status: PortfolioStatus.ACTIVE })
      .getMany();

    const portfolioStats = await Promise.all(
      portfolios.map(async (portfolio) => {
        // Get debts for this portfolio
        const debts = await this.debtRepository.find({
          where: {
            organizationId,
            portfolioId: portfolio.id,
          },
        });

        const totalInvested = parseFloat(portfolio.purchasePrice || '0');

        // Calculate "collected" as the difference between principal and current balance
        // for paid/settled debts (rough approximation until we have transaction data)
        const totalCollected = debts.reduce((sum: number, debt: Debt) => {
          const principal = parseFloat(debt.principalAmount || '0');
          const current = parseFloat(debt.currentBalance || '0');

          if (debt.status === DebtStatus.PAID_IN_FULL || debt.status === DebtStatus.SETTLED) {
            return sum + principal; // Assume full principal collected for terminal states
          } else if (current < principal) {
            return sum + (principal - current); // Partial payment
          }
          return sum;
        }, 0);

        const recoveryRate = totalInvested > 0 ? (totalCollected / totalInvested) * 100 : 0;

        return {
          id: portfolio.id,
          name: portfolio.name,
          recoveryRate,
          totalCollected,
        };
      }),
    );

    // Sort by recovery rate descending, take top 5
    return portfolioStats
      .sort((a, b) => b.recoveryRate - a.recoveryRate)
      .slice(0, 5);
  }

  /**
   * Get debt data for recovery trends grouped by period
   */
  async getRecoveryTrends(
    organizationId: string,
    query: RecoveryTrendsInternalQueryDto,
  ): Promise<RecoveryTrendsDebtResponseDto> {
    this.logger.log(`[getRecoveryTrends] START for org: ${organizationId}`);

    // Add period selection based on granularity
    const periodExpression = this.getPeriodExpression(query.granularity || TrendGranularity.MONTHLY);

    const queryBuilder = this.debtRepository
      .createQueryBuilder('debt')
      .select(periodExpression, 'period')
      .where('debt.organizationId = :organizationId', { organizationId });

    // Apply filters
    this.applyTrendsFilters(queryBuilder, query);

    // Add grouping
    if (query.groupBy === AnalyticsGroupBy.DEBT_CATEGORY) {
      queryBuilder.addSelect('debt.debtCategory', 'groupKey');
    } else if (query.groupBy === AnalyticsGroupBy.PORTFOLIO) {
      queryBuilder.addSelect('debt.portfolioId', 'groupKey');
    }

    // Add aggregations
    queryBuilder
      .addSelect('SUM(CAST(debt.principalAmount AS DECIMAL))', 'totalPrincipal')
      .addSelect('COUNT(debt.id)', 'debtCount')
      .groupBy('period');

    // Group by category/portfolio if specified
    if (query.groupBy && query.groupBy !== AnalyticsGroupBy.NONE) {
      queryBuilder.addGroupBy('groupKey');
    }

    queryBuilder.orderBy('period', 'ASC');

    const results = await queryBuilder.getRawMany();

    const debtsOverTime: DebtPeriodDataDto[] = results.map((row) => ({
      period: row.period,
      totalPrincipal: parseFloat(row.totalPrincipal || '0').toFixed(2),
      debtCount: parseInt(row.debtCount, 10),
      ...(row.groupKey && { groupKey: row.groupKey }),
    }));

    this.logger.log(`[getRecoveryTrends] Found ${debtsOverTime.length} debt periods`);

    return { debtsOverTime };
  }

  /**
   * Apply analytics filters to query builder
   */
  private applyTrendsFilters(
    queryBuilder: SelectQueryBuilder<Debt>,
    query: RecoveryTrendsInternalQueryDto,
  ): void {
    if (query.startDate) {
      queryBuilder.andWhere('debt.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('debt.createdAt <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    if (query.portfolioId) {
      queryBuilder.andWhere('debt.portfolioId = :portfolioId', {
        portfolioId: query.portfolioId,
      });
    }

    // Note: portfolioTag filtering is handled at the orchestrator level
    // since Debt entity doesn't have a relation to Portfolio

    if (query.debtCategory) {
      queryBuilder.andWhere('debt.debtCategory = :debtCategory', {
        debtCategory: query.debtCategory,
      });
    }
  }

  /**
   * Get SQL expression for period grouping based on granularity
   */
  private getPeriodExpression(granularity: TrendGranularity): string {
    switch (granularity) {
      case TrendGranularity.DAILY:
        return "TO_CHAR(debt.created_at, 'YYYY-MM-DD')";
      case TrendGranularity.WEEKLY:
        return "TO_CHAR(debt.created_at, 'IYYY-\"W\"IW')";
      case TrendGranularity.MONTHLY:
        return "TO_CHAR(debt.created_at, 'YYYY-MM')";
      case TrendGranularity.QUARTERLY:
        return "TO_CHAR(debt.created_at, 'YYYY-\"Q\"Q')";
      case TrendGranularity.YEARLY:
        return "TO_CHAR(debt.created_at, 'YYYY')";
      default:
        return "TO_CHAR(debt.created_at, 'YYYY-MM')";
    }
  }

  /**
   * Get portfolio performance debt metrics
   * Returns debt statistics for each portfolio
   *
   * OPTIMIZED: Uses single aggregated query instead of N+1 queries
   */
  async getPortfolioPerformance(
    organizationId: string,
    query: PortfolioPerformanceInternalQueryDto,
  ): Promise<PortfolioPerformanceDebtResponseDto> {
    this.logger.log(`[getPortfolioPerformance] START for org: ${organizationId}`);

    // Build portfolio query with filters
    const portfolioQueryBuilder = this.portfolioRepository
      .createQueryBuilder('portfolio')
      .where('portfolio.organization_id = :organizationId', { organizationId })
      .andWhere('portfolio.status = :status', { status: PortfolioStatus.ACTIVE });

    // Apply portfolio filters
    if (query.portfolioId) {
      portfolioQueryBuilder.andWhere('portfolio.id = :portfolioId', {
        portfolioId: query.portfolioId,
      });
    }

    if (query.portfolioTag && query.portfolioTag.length > 0) {
      portfolioQueryBuilder.andWhere('portfolio.tags && :tags', {
        tags: query.portfolioTag,
      });
    }

    if (query.startDate) {
      portfolioQueryBuilder.andWhere('portfolio.purchase_date >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      portfolioQueryBuilder.andWhere('portfolio.purchase_date <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    // Get total count for pagination
    const totalPortfolios = await portfolioQueryBuilder.getCount();
    this.logger.log(`[getPortfolioPerformance] Total portfolios: ${totalPortfolios}`);

    // Apply pagination
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const totalPages = Math.ceil(totalPortfolios / pageSize);

    portfolioQueryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const portfolioEntities = await portfolioQueryBuilder.getMany();
    this.logger.log(`[getPortfolioPerformance] Found ${portfolioEntities.length} portfolios on page ${page}`);

    if (portfolioEntities.length === 0) {
      return { portfolios: [], totalPortfolios, page, pageSize, totalPages };
    }

    // Get portfolio IDs for aggregation query
    const portfolioIds = portfolioEntities.map(p => p.id);

    // Build optimized aggregation query - ONE query for all portfolios
    const debtAggQueryBuilder = this.debtRepository
      .createQueryBuilder('debt')
      .select('debt.portfolio_id', 'portfolioId')
      .addSelect('COUNT(*)', 'debtCount')
      .addSelect('SUM(CAST(debt.principal_amount AS DECIMAL))', 'totalPrincipal')
      .addSelect(
        `SUM(CASE WHEN debt.status IN ('${DebtStatus.ACTIVE}', '${DebtStatus.PAYMENT_PLAN}') THEN 1 ELSE 0 END)`,
        'activeDebts'
      )
      .addSelect(
        `SUM(CASE WHEN debt.status IN ('${DebtStatus.PAID_IN_FULL}', '${DebtStatus.SETTLED}') THEN 1 ELSE 0 END)`,
        'paidDebts'
      )
      .where('debt.organization_id = :organizationId', { organizationId })
      .andWhere('debt.portfolio_id IN (:...portfolioIds)', { portfolioIds })
      .groupBy('debt.portfolio_id');

    // Apply debt category filter if specified
    if (query.debtCategory) {
      debtAggQueryBuilder.andWhere('debt.debt_category = :debtCategory', {
        debtCategory: query.debtCategory,
      });
    }

    const debtAggregates = await debtAggQueryBuilder.getRawMany();
    this.logger.log(`[getPortfolioPerformance] Calculated aggregates for ${debtAggregates.length} portfolios with debts`);

    // Get primary debt category for each portfolio (requires separate query due to aggregation complexity)
    const primaryCategories = await this.getPrimaryDebtCategories(organizationId, portfolioIds, query.debtCategory);

    // Build mapping for fast lookup
    const debtMetricsMap = new Map<string, any>();
    debtAggregates.forEach(agg => {
      debtMetricsMap.set(agg.portfolioId, {
        debtCount: parseInt(agg.debtCount, 10),
        totalPrincipal: parseFloat(agg.totalPrincipal || '0'),
        activeDebts: parseInt(agg.activeDebts, 10),
        paidDebts: parseInt(agg.paidDebts, 10),
      });
    });

    // Merge portfolio entities with debt metrics
    const portfolioMetrics: PortfolioDebtMetricsDto[] = portfolioEntities.map(portfolio => {
      const metrics = debtMetricsMap.get(portfolio.id) || {
        debtCount: 0,
        totalPrincipal: 0,
        activeDebts: 0,
        paidDebts: 0,
      };

      return {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        purchasePrice: portfolio.purchasePrice || '0.00',
        totalPrincipal: metrics.totalPrincipal.toFixed(2),
        debtCount: metrics.debtCount,
        activeDebts: metrics.activeDebts,
        paidDebts: metrics.paidDebts,
        primaryDebtCategory: primaryCategories.get(portfolio.id),
        portfolioTags: portfolio.portfolioTags || [],
      };
    });

    this.logger.log(`[getPortfolioPerformance] COMPLETE - returning ${portfolioMetrics.length} portfolios`);

    return { portfolios: portfolioMetrics, totalPortfolios, page, pageSize, totalPages };
  }

  /**
   * Helper method to get the primary (most common) debt category for each portfolio
   */
  private async getPrimaryDebtCategories(
    organizationId: string,
    portfolioIds: string[],
    debtCategoryFilter?: DebtCategory,
  ): Promise<Map<string, DebtCategory | undefined>> {
    const queryBuilder = this.debtRepository
      .createQueryBuilder('debt')
      .select('debt.portfolio_id', 'portfolioId')
      .addSelect('debt.debt_category', 'debtCategory')
      .addSelect('COUNT(*)', 'count')
      .where('debt.organization_id = :organizationId', { organizationId })
      .andWhere('debt.portfolio_id IN (:...portfolioIds)', { portfolioIds })
      .andWhere('debt.debt_category IS NOT NULL')
      .groupBy('debt.portfolio_id')
      .addGroupBy('debt.debt_category');

    if (debtCategoryFilter) {
      queryBuilder.andWhere('debt.debt_category = :debtCategory', {
        debtCategory: debtCategoryFilter,
      });
    }

    const results = await queryBuilder.getRawMany();

    // Find the most common category for each portfolio
    const categoryMap = new Map<string, DebtCategory>();
    const categoryCountMap = new Map<string, Map<DebtCategory, number>>();

    results.forEach(row => {
      if (!categoryCountMap.has(row.portfolioId)) {
        categoryCountMap.set(row.portfolioId, new Map());
      }
      const counts = categoryCountMap.get(row.portfolioId)!;
      counts.set(row.debtCategory, parseInt(row.count, 10));
    });

    categoryCountMap.forEach((counts, portfolioId) => {
      let maxCategory: DebtCategory | undefined;
      let maxCount = 0;

      counts.forEach((count, category) => {
        if (count > maxCount) {
          maxCount = count;
          maxCategory = category;
        }
      });

      if (maxCategory) {
        categoryMap.set(portfolioId, maxCategory);
      }
    });

    return categoryMap;
  }

  /**
   * Get portfolio information for a set of debtors.
   * Used by the orchestrator to aggregate collector workload distribution.
   */
  async getDebtorPortfolios(
    organizationId: string,
    debtorProfileIds: string[],
  ): Promise<Record<string, any[]>> {
    this.logger.log(
      `[getDebtorPortfolios] START for org: ${organizationId}, debtors: ${debtorProfileIds?.length || 0}`,
    );

    if (!debtorProfileIds || debtorProfileIds.length === 0) {
      return {};
    }

    const results = await this.debtRepository
      .createQueryBuilder('debt')
      .innerJoin('debt_debtor', 'dd', 'dd.debt_id = debt.id')
      .innerJoin('debt.portfolio', 'portfolio')
      .select('dd.debtor_profile_id', 'debtorId')
      .addSelect('debt.portfolio_id', 'portfolioId')
      .addSelect('portfolio.name', 'portfolioName')
      .addSelect('COUNT(debt.id)', 'accountCount')
      .addSelect('SUM(CAST(debt.current_balance AS DECIMAL))', 'totalBalance')
      .where('debt.organization_id = :organizationId', { organizationId })
      .andWhere('dd.debtor_profile_id IN (:...debtorProfileIds)', { debtorProfileIds })
      .groupBy('dd.debtor_profile_id')
      .addGroupBy('debt.portfolio_id')
      .addGroupBy('portfolio.name')
      .getRawMany();

    // Group results by debtorId
    const distribution: Record<string, any[]> = {};
    results.forEach((row) => {
      if (!distribution[row.debtorId]) {
        distribution[row.debtorId] = [];
      }
      distribution[row.debtorId].push({
        portfolioId: row.portfolioId,
        portfolioName: row.portfolioName,
        accountCount: parseInt(row.accountCount, 10),
        totalBalance: parseFloat(row.totalBalance || '0'),
      });
    });

    return distribution;
  }

  /**
   * Get debt-to-portfolio mapping for analytics orchestration
   * Returns a lightweight mapping of debt IDs to portfolio IDs
   *
   * This is used by the orchestrator to connect debt-related data (payments)
   * to portfolios without transferring full entity data.
   *
   * @param organizationId - Organization UUID
   * @param portfolioIds - Optional array of portfolio IDs to filter by
   * @returns Object mapping debtId to portfolioId
   */
  async getDebtPortfolioMap(
    organizationId: string,
    portfolioIds?: string[],
  ): Promise<Record<string, string>> {
    this.logger.log(`[getDebtPortfolioMap] START for org: ${organizationId}, portfolioIds: ${portfolioIds?.length || 'all'}`);

    const queryBuilder = this.debtRepository
      .createQueryBuilder('debt')
      .select('debt.id', 'debtId')
      .addSelect('debt.portfolio_id', 'portfolioId')
      .where('debt.organization_id = :organizationId', { organizationId });

    // Filter by specific portfolios if provided
    if (portfolioIds && portfolioIds.length > 0) {
      queryBuilder.andWhere('debt.portfolio_id IN (:...portfolioIds)', { portfolioIds });
    }

    const debts = await queryBuilder.getRawMany();

    this.logger.log(`[getDebtPortfolioMap] Found ${debts.length} debt mappings`);

    // Build mapping object with explicit column aliases
    const mapping: Record<string, string> = {};
    debts.forEach((debt) => {
      if (debt.debtId && debt.portfolioId) {
        mapping[debt.debtId] = debt.portfolioId;
      }
    });

    this.logger.log(`[getDebtPortfolioMap] Built mapping with ${Object.keys(mapping).length} entries`);

    return mapping;
  }

  /**
   * Get flow analytics for debts
   * Returns debt data grouped by the specified dimension (DEBT_CATEGORY or PORTFOLIO)
   */
  async getFlowAnalytics(
    organizationId: string,
    query: FlowAnalyticsInternalQueryDto,
  ): Promise<FlowAnalyticsDebtResponseDto> {
    this.logger.log(`[getFlowAnalytics] START for org: ${organizationId}, view: ${query.view}`);

    // Build base query
    const queryBuilder = this.debtRepository
      .createQueryBuilder('debt')
      .where('debt.organization_id = :organizationId', { organizationId });

    // Apply filters
    if (query.startDate) {
      queryBuilder.andWhere('debt.created_at >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('debt.created_at <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    if (query.portfolioId) {
      queryBuilder.andWhere('debt.portfolio_id = :portfolioId', {
        portfolioId: query.portfolioId,
      });
    }

    if (query.portfolioTag && query.portfolioTag.length > 0) {
      // Join with portfolio to filter by tags
      queryBuilder
        .innerJoin('debt.portfolio', 'portfolio')
        .andWhere('portfolio.tags && :tags', { tags: query.portfolioTag });
    }

    if (query.debtCategory) {
      queryBuilder.andWhere('debt.debt_category = :debtCategory', {
        debtCategory: query.debtCategory,
      });
    }

    // Group by dimension based on view
    let dimensionField: string;
    let dimensionLabel: string;

    if (query.view === FlowDimension.DEBT_CATEGORY) {
      dimensionField = 'debt.debt_category';
      dimensionLabel = 'debtCategory';
    } else if (query.view === FlowDimension.PORTFOLIO) {
      dimensionField = 'debt.portfolio_id';
      dimensionLabel = 'portfolioId';
    } else {
      // PAYMENT_METHOD, STATE, STATUS_TRANSITION are not handled by api-debts
      this.logger.log(`[getFlowAnalytics] View ${query.view} not supported by api-debts, returning empty`);
      return { debtsByDimension: [] };
    }

    // Aggregate by dimension
    queryBuilder
      .select(dimensionField, 'dimensionValue')
      .addSelect('SUM(CAST(debt.principal_amount AS DECIMAL))', 'totalPrincipal')
      .addSelect('COUNT(debt.id)', 'debtCount')
      .groupBy(dimensionField)
      .orderBy('"totalPrincipal"', 'DESC');

    const results = await queryBuilder.getRawMany();

    this.logger.log(`[getFlowAnalytics] Found ${results.length} dimension groups`);

    // Transform results
    const debtsByDimension: FlowDimensionDataDto[] = await Promise.all(
      results.map(async (row) => {
        let label = row.dimensionValue;

        // Enrich labels for better display
        if (query.view === FlowDimension.PORTFOLIO && row.dimensionValue) {
          // Fetch portfolio name for better labeling
          const portfolio = await this.portfolioRepository.findOne({
            where: { id: row.dimensionValue },
            select: ['name'],
          });
          label = portfolio?.name || row.dimensionValue;
        }

        return {
          dimensionValue: row.dimensionValue,
          label,
          totalPrincipal: parseFloat(row.totalPrincipal || '0').toFixed(2),
          debtCount: parseInt(row.debtCount, 10),
        };
      }),
    );

    this.logger.log(`[getFlowAnalytics] Processed ${debtsByDimension.length} dimension groups`);

    return { debtsByDimension };
  }

  /**
   * Get geographic debt analytics
   * Returns debt financial metrics grouped by debtor state
   *
   * This method joins across bounded contexts to debtor_addresses table
   * to aggregate debt financial data by state.
   */
  async getGeographicDebts(
    organizationId: string,
    query: GeographicDebtsQueryDto,
  ): Promise<GeographicDebtsResponseDto> {
    this.logger.log(`[getGeographicDebts] START for org: ${organizationId}`);

    // Build query to get debt metrics grouped by debtor_profile_id
    // The orchestrator will join this with state data from api-debtors
    const queryBuilder = this.debtRepository
      .createQueryBuilder('debt')
      .innerJoin('debt_debtor', 'dd', 'dd.debt_id = debt.id')
      .select('dd.debtor_profile_id', 'debtorProfileId')
      .addSelect('SUM(CAST(debt.principal_amount AS DECIMAL))', 'totalDebtValue')
      .addSelect('AVG(CAST(debt.principal_amount AS DECIMAL))', 'averageDebtValue')
      .addSelect('COUNT(debt.id)', 'totalDebts')
      .addSelect(
        `COUNT(CASE WHEN debt.status IN ('${DebtStatus.ACTIVE}', '${DebtStatus.PAYMENT_PLAN}') THEN 1 END)`,
        'activeDebts',
      )
      .addSelect(
        `COUNT(CASE WHEN debt.status IN ('${DebtStatus.PAID_IN_FULL}', '${DebtStatus.SETTLED}') THEN 1 END)`,
        'paidDebts',
      )
      .addSelect(
        `COUNT(CASE WHEN debt.status = '${DebtStatus.CHARGED_OFF}' THEN 1 END)`,
        'defaultedDebts',
      )
      .where('debt.organization_id = :organizationId', { organizationId })
      .groupBy('dd.debtor_profile_id');

    // Apply filters
    if (query.portfolioId) {
      queryBuilder.andWhere('debt.portfolio_id = :portfolioId', {
        portfolioId: query.portfolioId,
      });
    }

    if (query.startDate) {
      queryBuilder.andWhere('debt.created_at >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('debt.created_at <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    const rawResults = await queryBuilder.getRawMany();

    this.logger.log(`[getGeographicDebts] Found ${rawResults.length} debtors with debts`);

    // Calculate recovery rate for each debtor
    // Recovery rate = (principal - current balance) / principal for terminal debts
    const debtorMetrics: DebtorDebtMetricsDto[] = await Promise.all(
      rawResults.map(async (row) => {
        const debtorProfileId = row.debtorProfileId as string;

        // Get detailed debt info for recovery rate calculation
        const debtorDebtQuery = this.debtRepository
          .createQueryBuilder('debt')
          .innerJoin('debt_debtor', 'dd', 'dd.debt_id = debt.id')
          .where('debt.organization_id = :organizationId', { organizationId })
          .andWhere('dd.debtor_profile_id = :debtorProfileId', { debtorProfileId });

        // Apply same filters
        if (query.portfolioId) {
          debtorDebtQuery.andWhere('debt.portfolio_id = :portfolioId', {
            portfolioId: query.portfolioId,
          });
        }

        if (query.startDate) {
          debtorDebtQuery.andWhere('debt.created_at >= :startDate', {
            startDate: new Date(query.startDate),
          });
        }

        if (query.endDate) {
          debtorDebtQuery.andWhere('debt.created_at <= :endDate', {
            endDate: new Date(query.endDate),
          });
        }

        const debtorDebts = await debtorDebtQuery.getMany();

        // Calculate recovery rate
        const totalPrincipal = debtorDebts.reduce((sum, debt) => {
          return sum + parseFloat(debt.principalAmount || '0');
        }, 0);

        const totalCollected = debtorDebts.reduce((sum, debt) => {
          const principal = parseFloat(debt.principalAmount || '0');
          const current = parseFloat(debt.currentBalance || '0');

          // For paid/settled debts, assume principal was collected
          if (debt.status === DebtStatus.PAID_IN_FULL || debt.status === DebtStatus.SETTLED) {
            return sum + principal;
          } else if (current < principal) {
            // Partial payment
            return sum + (principal - current);
          }
          return sum;
        }, 0);

        const recoveryRate = totalPrincipal > 0 ? (totalCollected / totalPrincipal) * 100 : 0;

        return {
          debtorProfileId,
          totalDebtValue: parseFloat(row.totalDebtValue || '0'),
          averageDebtValue: parseFloat(row.averageDebtValue || '0'),
          totalDebts: parseInt(row.totalDebts, 10),
          activeDebts: parseInt(row.activeDebts, 10),
          paidDebts: parseInt(row.paidDebts, 10),
          defaultedDebts: parseInt(row.defaultedDebts, 10),
          recoveryRate: Math.round(recoveryRate * 100) / 100, // Round to 2 decimals
        };
      }),
    );

    // Calculate total debt value across all debtors
    const totalDebtValue = debtorMetrics.reduce((sum, debtor) => sum + debtor.totalDebtValue, 0);

    this.logger.log(`[getGeographicDebts] Calculated metrics for ${debtorMetrics.length} debtors, total debt value: ${totalDebtValue}`);

    return {
      totalDebtValue,
      debtorMetrics,
    };
  }

  /**
   * Get geographic creditor analytics
   * Returns creditor metrics grouped by creditor state
   *
   * NOTE: This implementation is currently limited because the Debt entity
   * does not have an originalCreditorId field linking to Company entities,
   * and creditor companies do not have addresses in entity_addresses table.
   *
   * TODO: Once schema is updated with:
   * 1. debt.original_creditor_id (UUID FK to companies)
   * 2. Creditor company addresses in entity_addresses
   * Then update this method to join to companies and entity_addresses tables
   *
   * Current behavior: Returns placeholder/empty data
   */
  async getGeographicCreditors(
    organizationId: string,
    query: GeographicCreditorsQueryDto,
  ): Promise<GeographicCreditorsResponseDto> {
    this.logger.log(`[getGeographicCreditors] START for org: ${organizationId}`);

    // Join debts to creditors and group by creditor state
    const queryBuilder = this.debtRepository
      .createQueryBuilder('debt')
      .innerJoin('creditors', 'creditor', 'debt.creditor_id = creditor.id')
      .select('creditor.state', 'stateCode')
      .addSelect('creditor.id', 'creditorId')
      .addSelect('creditor.legal_name', 'creditorName')
      .addSelect('SUM(CAST(debt.principal_amount AS DECIMAL))', 'totalDebtValue')
      .addSelect('COUNT(debt.id)', 'debtCount')
      .where('debt.organization_id = :organizationId', { organizationId })
      .andWhere('creditor.state IS NOT NULL')
      .andWhere('debt.creditor_id IS NOT NULL')
      .groupBy('creditor.state')
      .addGroupBy('creditor.id')
      .addGroupBy('creditor.legal_name')
      .orderBy('"totalDebtValue"', 'DESC');

    // Apply filters
    if (query.states && query.states.length > 0) {
      queryBuilder.andWhere('creditor.state IN (:...states)', {
        states: query.states,
      });
    }

    if (query.portfolioId) {
      queryBuilder.andWhere('debt.portfolio_id = :portfolioId', {
        portfolioId: query.portfolioId,
      });
    }

    if (query.startDate) {
      queryBuilder.andWhere('debt.created_at >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      queryBuilder.andWhere('debt.created_at <= :endDate', {
        endDate: new Date(query.endDate),
      });
    }

    const rawResults = await queryBuilder.getRawMany();

    this.logger.log(
      `[getGeographicCreditors] Found ${rawResults.length} creditor-state combinations`,
    );

    // Group by state
    const stateMap = new Map<
      string,
      {
        creditors: Set<string>;
        totalDebtValue: number;
        topCreditors: Map<
          string,
          { id: string; name: string; debtValue: number }
        >;
      }
    >();

    for (const row of rawResults) {
      const state = row.stateCode;

      if (!stateMap.has(state)) {
        stateMap.set(state, {
          creditors: new Set(),
          totalDebtValue: 0,
          topCreditors: new Map(),
        });
      }

      const stateData = stateMap.get(state)!;
      stateData.creditors.add(row.creditorId);
      stateData.totalDebtValue += parseFloat(row.totalDebtValue || '0');

      // Track top creditors per state
      stateData.topCreditors.set(row.creditorId, {
        id: row.creditorId,
        name: row.creditorName,
        debtValue: parseFloat(row.totalDebtValue || '0'),
      });
    }

    // Build response
    const states: StateCreditorMetricsDto[] = Array.from(stateMap.entries())
      .map(([stateCode, data]) => {
        // Get top 3 creditors by debt value for this state
        const topCreditors = Array.from(data.topCreditors.values())
          .sort((a, b) => b.debtValue - a.debtValue)
          .slice(0, 3)
          .map((c) => ({
            id: c.id,
            name: c.name,
            debtValue: c.debtValue,
          }));

        return {
          stateCode: stateCode as StateAbbreviation,
          creditorCount: data.creditors.size,
          totalDebtValue: data.totalDebtValue,
          averageDebtValue:
            data.creditors.size > 0
              ? data.totalDebtValue / data.creditors.size
              : 0,
          topCreditors,
        };
      })
      .sort((a, b) => b.totalDebtValue - a.totalDebtValue);

    const totalCreditors = new Set(rawResults.map((r) => r.creditorId)).size;
    const totalDebtValue = states.reduce(
      (sum, s) => sum + s.totalDebtValue,
      0,
    );

    this.logger.log(
      `[getGeographicCreditors] Returning ${states.length} states, ${totalCreditors} unique creditors, total debt value: ${totalDebtValue}`,
    );

    return {
      totalCreditors,
      totalDebtValue,
      states,
    };
  }

  /**
   * Get all debts for a specific debtor profile (for debtor focus view)
   *
   * @param organizationId - Organization ID
   * @param debtorProfileId - Debtor profile ID
   * @returns Debt information for the debtor
   */
  async getDebtorDebts(
    organizationId: string,
    debtorProfileId: string,
  ): Promise<DebtorFocusDebtsResponseDto> {
    this.logger.log(
      `Getting debts for debtor profile ${debtorProfileId} in organization ${organizationId}`,
    );

    // Fetch all debts for this debtor
    const debts = await this.debtRepository
      .createQueryBuilder('debt')
      .innerJoin('debt_debtor', 'debtDebtor', 'debtDebtor.debt_id = debt.id')
      .where('debt.organization_id = :organizationId', { organizationId })
      .andWhere('debtDebtor.debtor_profile_id = :debtorProfileId', { debtorProfileId })
      .getMany();

    this.logger.log(`Found ${debts.length} debts for debtor ${debtorProfileId}`);

    // Fetch portfolio information for all unique portfolio IDs
    const portfolioIds = [...new Set(debts.map(debt => debt.portfolioId))];
    const portfolios = await this.portfolioRepository.find({
      where: portfolioIds.map(id => ({ id })),
      select: ['id', 'name'],
    });
    const portfolioMap = new Map(portfolios.map(p => [p.id, p.name]));

    // Calculate aggregates
    let totalPrincipal = 0;
    let totalBalance = 0;
    let totalInterest = 0;
    let totalFees = 0;
    let activeDebtCount = 0;

    // Find oldest delinquent date
    const delinquencyDates = debts
      .filter((debt) => debt.firstDelinquencyDate)
      .map((debt) => new Date(debt.firstDelinquencyDate!));
    const oldestDelinquentDate = delinquencyDates.length > 0
      ? delinquencyDates.reduce((oldest, date) => (date < oldest ? date : oldest))
      : null;

    const debtDtos: DebtorFocusDebtDto[] = debts.map((debt) => {
      totalPrincipal += Number(debt.principalAmount);
      totalBalance += Number(debt.currentBalance);
      totalInterest += Number(debt.interestAmount || 0);
      totalFees += Number(debt.feesAmount || 0);

      const isActiveDebt =
        debt.status !== DebtStatus.PAID_IN_FULL &&
        debt.status !== DebtStatus.SETTLED &&
        debt.status !== DebtStatus.CHARGED_OFF &&
        debt.status !== DebtStatus.SOLD;

      if (isActiveDebt) {
        activeDebtCount++;
      }

      // Calculate days overdue from first delinquency date
      let daysOverdue = 0;
      if (debt.firstDelinquencyDate) {
        const delinquentDate = new Date(debt.firstDelinquencyDate);
        const today = new Date();
        daysOverdue = Math.max(0, Math.floor((today.getTime() - delinquentDate.getTime()) / (1000 * 60 * 60 * 24)));
      }

      // Determine if debt has a payment plan based on status
      const hasPaymentPlan = debt.status === DebtStatus.PAYMENT_PLAN;

      return {
        id: debt.id,
        accountNumber: debt.accountNumber,
        originalCreditorName: debt.originalCreditorName || 'Unknown',
        debtType: debt.debtCategory || 'OTHER',
        status: debt.status,
        principalAmount: Number(debt.principalAmount),
        interestAmount: Number(debt.interestAmount || 0),
        feesAmount: Number(debt.feesAmount || 0),
        currentBalance: Number(debt.currentBalance),
        daysOverdue,
        lastPaymentDate: debt.lastPaymentDate ? new Date(debt.lastPaymentDate) : null,
        lastPaymentAmount: null,
        nextPaymentDue: null,
        hasPaymentPlan,
        hasDispute: debt.isDisputed || false,
      };
    });

    return {
      debts: debtDtos,
      totalPrincipal,
      totalBalance,
      totalInterest,
      totalFees,
      activeDebtCount,
      oldestDelinquentDate: oldestDelinquentDate
        ? oldestDelinquentDate.toISOString().split('T')[0]
        : null,
    };
  }
}
