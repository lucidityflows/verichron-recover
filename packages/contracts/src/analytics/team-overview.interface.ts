import { CollectorAvailabilityStatus } from '@verichron/enums';

export interface ITeamOverviewCollector {
  userId: string;
  fullName: string;
  email: string;
  status: CollectorAvailabilityStatus;
  lastActivity: string; // ISO Timestamp
  workload: {
    active: number;
    capacity: number;
    percentage: number;
  };
  performance: {
    todayCollected: number;
    todayContacts: number;
    goalProgress: number; // Overall percentage across active goals
  };
  portfolios: Array<{
    portfolioId: string;
    portfolioName: string;
    accountCount: number;
    totalBalance: number;
  }>;
}

export interface ITeamOverview {
  organizationId: string;
  teamId?: string;
  collectors: ITeamOverviewCollector[];
  teamTotals: {
    totalCollected: number;
    totalContacts: number;
    averageGoalProgress: number;
    activeCollectors: number;
  };
  timestamp: string;
}
