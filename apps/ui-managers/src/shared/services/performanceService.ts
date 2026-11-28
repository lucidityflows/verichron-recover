import { collectorsApiClient } from './apiClient.js';
import { TrendGranularity } from '../../api/generated/collectors_models/index.js';
import type { AxiosRequestConfig } from '@verichron/api-client';

export interface LiveActivity {
  id: string;
  timestamp: string;
  collectorId: string;
  collectorName: string;
  debtorId: string;
  debtorName: string;
  activityType: 'call' | 'email' | 'sms' | 'payment' | 'promise' | 'note';
  outcome?: 'success' | 'no_answer' | 'left_voicemail' | 'bounced' | 'contacted';
  amount?: number;
  description: string;
}

export interface TeamMetrics {
  today: {
    contactAttempts: number;
    successfulContacts: number;
    promisesSecured: number;
    paymentsReceived: number;
    totalCollected: number;
    activeCollectors: number;
  };
  thisWeek: {
    contactAttempts: number;
    successfulContacts: number;
    promisesSecured: number;
    paymentsReceived: number;
    totalCollected: number;
  };
  thisMonth: {
    contactAttempts: number;
    successfulContacts: number;
    promisesSecured: number;
    paymentsReceived: number;
    totalCollected: number;
  };
}

export interface LeaderboardEntry {
  rank: number;
  collectorId: string;
  collectorName: string;
  metric: number;
  trend: 'up' | 'down' | 'stable';
  change: number; // Percentage change from previous period
}

export interface VelocityData {
  hour: number; // 0-23
  contacts: number;
  promises: number;
  payments: number;
}

export interface ComplianceAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'fdcpa_violation' | 'cease_desist' | 'dispute' | 'bankruptcy';
  collectorId: string;
  collectorName: string;
  debtorId: string;
  debtorName: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export const performanceService = {
  /**
   * Get live activity feed
   */
  getLiveActivity: async (
    orgId: string,
    pageSize = 50,
    params?: { teamId?: string },
    config?: AxiosRequestConfig
  ): Promise<LiveActivity[]> => {
    // Fetch recent collector actions from the workstations
    const response = await collectorsApiClient.get<any>(
      `/v1/collectors/workstation/orgs/${orgId}/actions`,
      {
        params: {
          pageSize,
          teamId: params?.teamId
        },
        ...config
      }
    );

    const actions = response.data?.data || [];
    return actions.map((action: any) => ({
      id: action.id,
      timestamp: action.timestamp || action.createdAt,
      collectorId: action.collectorUserId,
      collectorName: action.collectorName || 'Collector',
      debtorId: action.debtorId,
      debtorName: action.debtorName || 'Debtor',
      activityType: action.actionType.toLowerCase(),
      outcome: action.outcome?.toLowerCase(),
      amount: action.paymentDetails?.amount,
      description: action.content || `${action.actionType} attempt`,
    }));
  },

  /**
   * Get team-wide metrics
   */
  getTeamMetrics: async (
    orgId: string,
    params?: { teamId?: string },
    config?: AxiosRequestConfig
  ): Promise<TeamMetrics> => {
    // Use the optimized dashboard-summary endpoint from collectors API
    const response = await collectorsApiClient.get<any>(
      `/v1/collectors/performance/orgs/${orgId}/dashboard-summary`,
      {
        params: { teamId: params?.teamId },
        ...config
      }
    );

    const data = response.data;
    
    // Map the summary DTO to our UI metrics structure
    return {
      today: {
        contactAttempts: data.todayStats?.totalContacts || 0,
        successfulContacts: data.todayStats?.totalContacts || 0, // Simplified mapping
        promisesSecured: 0, // To be implemented in backend
        paymentsReceived: 0, // To be implemented in backend
        totalCollected: (data.todayStats?.totalCollected || 0) / 100,
        activeCollectors: 0, // To be implemented in backend
      },
      thisWeek: {
        contactAttempts: data.weekStats?.totalContacts || 0,
        successfulContacts: data.weekStats?.totalContacts || 0,
        promisesSecured: 0,
        paymentsReceived: 0,
        totalCollected: (data.weekStats?.totalCollected || 0) / 100,
      },
      thisMonth: {
        contactAttempts: 0,
        successfulContacts: 0,
        promisesSecured: 0,
        paymentsReceived: 0,
        totalCollected: 0,
      }
    };
  },

  /**
   * Get leaderboard data
   */
  getLeaderboard: async (
    orgId: string,
    metric: 'contacts' | 'promises' | 'collections' | 'efficiency',
    period: 'today' | 'week' | 'month',
    params?: { teamId?: string },
    config?: AxiosRequestConfig
  ): Promise<LeaderboardEntry[]> => {
    // Map period to TrendGranularity
    const granularityMap: Record<string, TrendGranularity> = {
      today: TrendGranularity.DAILY,
      week: TrendGranularity.WEEKLY,
      month: TrendGranularity.MONTHLY,
    };

    const response = await collectorsApiClient.get<any>(
      `/v1/collectors/performance/orgs/${orgId}/leaderboard`,
      {
        params: {
          period: granularityMap[period] || TrendGranularity.DAILY,
          teamId: params?.teamId,
          pageSize: 20,
        },
        ...config,
      }
    );

    const data = response.data;
    const entries = data.entries || [];

    return entries.map((entry: any) => {
      let metricValue = 0;
      if (metric === 'collections') {
        metricValue = (entry.totalCollected || 0) / 100; // Convert cents to dollars
      } else if (metric === 'contacts') {
        metricValue = entry.totalContacts || 0;
      } else if (metric === 'promises') {
        metricValue = entry.promisesSecured || 0;
      } else if (metric === 'efficiency') {
        // Simple efficiency calc if not provided by backend
        metricValue = entry.totalContacts > 0 
          ? Math.round(((entry.accountsResolved || 0) / entry.totalContacts) * 100)
          : 0;
      }

      return {
        rank: entry.rank,
        collectorId: entry.collectorId,
        collectorName: entry.collectorName,
        metric: metricValue,
        trend: 'stable', // Backend doesn't provide trend yet
        change: 0, // Backend doesn't provide change yet
      };
    });
  },

  /**
   * Get velocity data (contacts per hour)
   */
  getVelocityData: async (
    orgId: string,
    date: string, // YYYY-MM-DD
    config?: AxiosRequestConfig
  ): Promise<VelocityData[]> => {
    // TODO: Implement with real API
    return [];
  },

  /**
   * Get compliance alerts
   */
  getComplianceAlerts: async (
    orgId: string,
    unacknowledgedOnly = true,
    config?: AxiosRequestConfig
  ): Promise<ComplianceAlert[]> => {
    // TODO: Implement with real API
    return [];
  },

  /**
   * Get historical performance metrics for a specific collector
   */
  getPerformanceHistory: async (
    orgId: string,
    collectorId: string,
    startDate: string,
    endDate: string,
    config?: AxiosRequestConfig
  ): Promise<any[]> => {
    const response = await collectorsApiClient.get<any[]>(
      `/v1/collectors/performance/orgs/${orgId}/history/${collectorId}`,
      {
        params: { startDate, endDate },
        ...config
      }
    );
    return response.data;
  },

  /**
   * Acknowledge a compliance alert
   */
  acknowledgeAlert: async (
    orgId: string,
    alertId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    // TODO: Implement with real API
  },
};
