import { collectorsApiClient, transactionsApiClient } from './apiClient';
import type { AxiosRequestConfig } from '@verichron/api-client';

export interface CollectorStatus {
  id: string;
  name: string;
  status: 'ACTIVE' | 'IDLE' | 'BREAK' | 'OFFLINE';
  currentDebtorName?: string;
  todayCollected: number;
  todayGoal: number;
  callsToday: number;
  lastActivity?: string;
}

export interface TeamStats {
  totalCollected: number;
  totalCalls: number;
  avgGoalProgress: number;
}

export interface FloorStatusResponse {
  collectors: CollectorStatus[];
  teamStats: TeamStats;
}

export interface SettlementApprovalRequest {
  id: string;
  debtId: string;
  organizationId: string;
  offeredBy: 'CREDITOR' | 'DEBTOR';
  originalBalance: string;
  settlementAmount: string;
  settlementPercentage: string;
  status: string;
  offerDate: string;
  notes?: string;
  createdBy?: string;
}

export interface CollectorAction {
  id: string;
  collectorUserId: string;
  debtorId: string;
  actionType: 'CALL' | 'SMS' | 'EMAIL' | 'PAYMENT' | 'NOTE';
  timestamp: string;
  metadata?: {
    amount?: number;
    duration?: number;
    [key: string]: string | number | boolean | undefined;
  };
}

/**
 * Floor Service
 *
 * Real-time monitoring and intervention for Team Leads.
 */
export const floorService = {
  /**
   * Get real-time status of collectors in the Lead's scope
   */
  getFloorStatus: async (
    organizationId: string,
    teamId?: string,
    config?: AxiosRequestConfig
  ): Promise<FloorStatusResponse> => {
    const response = await collectorsApiClient.get<FloorStatusResponse>(
      `/v1/collectors/floor/orgs/${organizationId}/status`,
      { params: { teamId }, ...config }
    );
    return response.data;
  },

  /**
   * Get all pending settlement offers requiring approval
   */
  getPendingSettlements: async (
    organizationId: string,
    config?: AxiosRequestConfig
  ): Promise<SettlementApprovalRequest[]> => {
    const response = await transactionsApiClient.get<SettlementApprovalRequest[]>(
      `/v1/transactions/settlements/orgs/${organizationId}/pending`,
      config
    );
    return response.data;
  },

  /**
   * Get recent collector actions for the live feed
   */
  getRecentActions: async (
    organizationId: string,
    teamId?: string,
    config?: AxiosRequestConfig
  ): Promise<CollectorAction[]> => {
    const response = await collectorsApiClient.get<{ data: CollectorAction[] }>(
      `/v1/collectors/workstation/orgs/${organizationId}/actions`,
      { params: { teamId, pageSize: 20 }, ...config }
    );
    return response.data.data;
  },

  /**
   * Approve a settlement offer
   */
  approveSettlement: async (
    organizationId: string,
    offerId: string,
    config?: AxiosRequestConfig
  ): Promise<{ success: boolean }> => {
    const response = await transactionsApiClient.post<{ success: boolean }>(
      `/v1/transactions/settlements/orgs/${organizationId}/${offerId}/approve`,
      {},
      config
    );
    return response.data;
  },

  /**
   * Reject a settlement offer
   */
  rejectSettlement: async (
    organizationId: string,
    offerId: string,
    config?: AxiosRequestConfig
  ): Promise<{ success: boolean }> => {
    const response = await transactionsApiClient.post<{ success: boolean }>(
      `/v1/transactions/settlements/orgs/${organizationId}/${offerId}/reject`,
      {},
      config
    );
    return response.data;
  },
};
