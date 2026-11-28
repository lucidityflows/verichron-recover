import { usersApiClient } from './apiClient.js';
import { analyticsService } from './analyticsService.js';
import type { AxiosRequestConfig } from '@verichron/api-client';

export interface CollectorStats {
  collectorId: string;
  collectorName: string;
  collectorEmail: string;
  status: 'active' | 'idle' | 'offline';
  currentWorkload: {
    totalAssigned: number;
    inProgress: number;
    completed: number;
  };
  todayActivity: {
    contactsMade: number;
    promisesSecured: number;
    paymentsLogged: number;
    totalCollected: number;
  };
  weekActivity: {
    contactsMade: number;
    promisesSecured: number;
    paymentsLogged: number;
    totalCollected: number;
  };
  lastActivity?: string;
  capacityStatus: 'under' | 'at' | 'over';
}

export interface TeamSummary {
  totalCollectors: number;
  activeCollectors: number;
  totalQueueSize: number;
  todayTotalContacts: number;
  todayTotalPromises: number;
  todayTotalPayments: number;
  todayTotalCollected: number;
}

export interface AssignWorkRequest {
  collectorIds: string[];
  accountIds: string[];
  strategy: 'load-balance' | 'skill-based' | 'geographic' | 'performance' | 'round-robin' | 'custom';
  notes?: string;
}

export const teamService = {
  /**
   * Get all collectors in the organization with their current stats
   */
  getTeamOverview: async (
    orgId: string,
    params?: { teamId?: string },
    config?: AxiosRequestConfig
  ): Promise<{ collectors: CollectorStats[]; summary: TeamSummary }> => {
    // Use real orchestrated team overview
    const overview = await analyticsService.getTeamOverview(orgId, params, config);

    const collectors: CollectorStats[] = overview.collectors.map(c => ({
      collectorId: c.userId,
      collectorName: c.fullName,
      collectorEmail: c.email || '',
      status: (c.status.toLowerCase() as any) || 'offline',
      currentWorkload: {
        totalAssigned: c.workload.active,
        inProgress: c.workload.active, // Use active workload
        completed: 0, // Not tracked in this DTO
      },
      todayActivity: {
        contactsMade: c.performance.todayContacts,
        promisesSecured: 0, // Not tracked in this DTO
        paymentsLogged: 0, // Not tracked separately
        totalCollected: c.performance.todayCollected / 100, // Cents to Dollars
      },
      weekActivity: {
        contactsMade: c.performance.todayContacts * 5, // Estimate
        promisesSecured: 0, // Not tracked
        paymentsLogged: 0,
        totalCollected: (c.performance.todayCollected / 100) * 5, // Estimate
      },
      lastActivity: c.lastActivity,
      capacityStatus: c.workload.percentage > 100 ? 'over' : c.workload.percentage >= 90 ? 'at' : 'under',
    }));

    const summary: TeamSummary = {
      totalCollectors: overview.collectors.length,
      activeCollectors: overview.teamTotals.activeCollectors,
      totalQueueSize: 0, // Not tracked in this DTO
      todayTotalContacts: overview.teamTotals.totalContacts,
      todayTotalPromises: 0, // Not tracked in this DTO
      todayTotalPayments: 0,
      todayTotalCollected: overview.teamTotals.totalCollected / 100,
    };

    return { collectors, summary };
  },

  /**
   * Get detailed stats for a specific collector
   */
  getCollectorDetails: async (
    orgId: string,
    collectorId: string,
    config?: AxiosRequestConfig
  ): Promise<CollectorStats> => {
    const { collectors } = await teamService.getTeamOverview(orgId, {}, config);
    const collector = collectors.find(c => c.collectorId === collectorId);
    
    if (!collector) {
      throw new Error('Collector not found');
    }
    
    return collector;
  },

  /**
   * Assign work to collectors
   */
  assignWork: async (
    orgId: string,
    request: AssignWorkRequest,
    config?: AxiosRequestConfig
  ): Promise<{ success: boolean; assignedCount: number }> => {
    // This will be implemented in api-work-queues
    const response = await usersApiClient.post<{ success: boolean; assignedCount: number }>(
      `/v1/collectors/work-queues/orgs/${orgId}/bulk/assign`,
      request,
      config
    );
    return response.data;
  },

  /**
   * Send message to collector(s)
   */
  sendMessage: async (
    orgId: string,
    collectorIds: string[],
    message: string,
    config?: AxiosRequestConfig
  ): Promise<{ success: boolean }> => {
    // This will be implemented in api-communications or notifications
    const response = await usersApiClient.post<{ success: boolean }>(
      `/v1/communications/notifications/orgs/${orgId}/messages`,
      { collectorIds, message },
      config
    );
    return response.data;
  },
};
