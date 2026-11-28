import { Logger } from '@nestjs/common';
import { type IRecoveryTrendDataPoint } from '@verichron/contracts';
import { AnalyticsGroupBy } from '@verichron/enums';

/**
 * Utility functions for aggregating analytics data from multiple services
 */
export class AnalyticsAggregationUtil {
  private static readonly logger = new Logger(AnalyticsAggregationUtil.name);

  /**
   * Aggregate recovery trends data from payments and debts into single time series
   *
   * @param payments - Payment data grouped by period
   * @param debts - Debt data grouped by period
   * @returns Aggregated trends with recovery rates calculated
   */
  static aggregateSingleSeriesTrends(
    payments: any[],
    debts: any[],
  ): IRecoveryTrendDataPoint[] {
    // Create a map of period -> data
    const periodMap = new Map<
      string,
      { collected: number; principal: number; debtCount: number }
    >();

    // Add payment data
    payments.forEach((p: any) => {
      const existing = periodMap.get(p.period) || {
        collected: 0,
        principal: 0,
        debtCount: 0,
      };
      existing.collected += parseFloat(p.totalCollected || '0');
      periodMap.set(p.period, existing);
    });

    // Add debt data
    debts.forEach((d: any) => {
      const existing = periodMap.get(d.period) || {
        collected: 0,
        principal: 0,
        debtCount: 0,
      };
      existing.principal += parseFloat(d.totalPrincipal || '0');
      existing.debtCount += d.debtCount || 0;
      periodMap.set(d.period, existing);
    });

    // Convert to array and calculate recovery rates
    const trends: IRecoveryTrendDataPoint[] = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        principalOwed: data.principal.toFixed(2),
        amountCollected: data.collected.toFixed(2),
        recoveryRate:
          data.principal > 0 ? (data.collected / data.principal) * 100 : 0,
        debtCount: data.debtCount,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return trends;
  }

  /**
   * Aggregate grouped trends (by debt category or portfolio)
   *
   * @param payments - Payment data with groupKey
   * @param debts - Debt data with groupKey
   * @returns Trends organized by group
   */
  static aggregateGroupedTrends(
    payments: any[],
    debts: any[],
  ): Record<string, IRecoveryTrendDataPoint[]> {
    const groupMap = new Map<
      string,
      Map<string, { collected: number; principal: number; debtCount: number }>
    >();

    // Add payment data
    payments.forEach((p: any) => {
      const groupKey = p.groupKey || 'UNKNOWN';
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, new Map());
      }
      const periodMap = groupMap.get(groupKey)!;
      const existing = periodMap.get(p.period) || {
        collected: 0,
        principal: 0,
        debtCount: 0,
      };
      existing.collected += parseFloat(p.totalCollected || '0');
      periodMap.set(p.period, existing);
    });

    // Add debt data
    debts.forEach((d: any) => {
      const groupKey = d.groupKey || 'UNKNOWN';
      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, new Map());
      }
      const periodMap = groupMap.get(groupKey)!;
      const existing = periodMap.get(d.period) || {
        collected: 0,
        principal: 0,
        debtCount: 0,
      };
      existing.principal += parseFloat(d.totalPrincipal || '0');
      existing.debtCount += d.debtCount || 0;
      periodMap.set(d.period, existing);
    });

    // Convert to result structure
    const result: Record<string, IRecoveryTrendDataPoint[]> = {};
    groupMap.forEach((periodMap, groupKey) => {
      result[groupKey] = Array.from(periodMap.entries())
        .map(([period, data]) => ({
          period,
          principalOwed: data.principal.toFixed(2),
          amountCollected: data.collected.toFixed(2),
          recoveryRate:
            data.principal > 0 ? (data.collected / data.principal) * 100 : 0,
          debtCount: data.debtCount,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
    });

    return result;
  }

  /**
   * Calculate overall metrics from trend data
   *
   * @param trends - Array of recovery trend data points
   * @returns Total collected and average recovery rate
   */
  static calculateOverallMetrics(
    trends: IRecoveryTrendDataPoint[],
  ): { totalCollected: string; avgRecoveryRate: number } {
    let totalCollected = 0;
    let totalPrincipal = 0;

    trends.forEach((t) => {
      totalCollected += parseFloat(t.amountCollected);
      totalPrincipal += parseFloat(t.principalOwed);
    });

    const avgRecoveryRate =
      totalPrincipal > 0 ? (totalCollected / totalPrincipal) * 100 : 0;

    return {
      totalCollected: totalCollected.toFixed(2),
      avgRecoveryRate,
    };
  }

  /**
   * Calculate overall metrics from grouped trends
   *
   * @param trendsByGroup - Trends organized by group key
   * @returns Total collected and average recovery rate
   */
  static calculateGroupedOverallMetrics(
    trendsByGroup: Record<string, IRecoveryTrendDataPoint[]>,
  ): { totalCollected: string; avgRecoveryRate: number } {
    let totalCollected = 0;
    let totalPrincipal = 0;

    Object.values(trendsByGroup).forEach((trends) => {
      trends.forEach((t) => {
        totalCollected += parseFloat(t.amountCollected);
        totalPrincipal += parseFloat(t.principalOwed);
      });
    });

    const avgRecoveryRate =
      totalPrincipal > 0 ? (totalCollected / totalPrincipal) * 100 : 0;

    return {
      totalCollected: totalCollected.toFixed(2),
      avgRecoveryRate,
    };
  }

  /**
   * Build query parameter string from filters
   *
   * @param filters - Query filters object
   * @returns URL query parameter string
   */
  static buildQueryParams(filters: Record<string, any>): string {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        // Handle array parameters (e.g., portfolioTag[])
        value.forEach((item) => {
          if (item !== undefined && item !== null) {
            params.append(key, String(item));
          }
        });
      } else {
        // Handle single value parameters
        params.append(key, String(value));
      }
    });

    return params.toString();
  }
}
