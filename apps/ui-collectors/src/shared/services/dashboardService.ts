/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { analyticsService } from './analyticsService';
import { goalsService } from './goalsService';
import { notificationControllerGetNotifications } from '../../api/generated/collectors/endpoints/notifications/notifications';
import { settingsControllerGetSettings } from '../../api/generated/organizations/endpoints/settings/settings';
import { NotificationResponseDtoType, GoalStatus, GoalType, GoalPeriod } from '../../api/generated/collectors_models';
import type { AxiosRequestConfig } from '@verichron/api-client';
import { ActivityFeedType } from '../../api/generated/organizations_models';

export interface TodaySnapshot {
  totalCollections: number;
  totalContacts: number;
  promisesSecured: number;
  activeCollectors: number;
  dailyCollectionsTarget: number;
  trends: {
    collections: number; // Percentage change from yesterday
    contacts: number;
    promises: number;
  };
}

export interface CriticalAlert {
  id: string;
  type: 'compliance' | 'goal_missed' | 'underperforming' | 'system';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface TeamStatusCollector {
  collectorId: string;
  collectorName: string;
  status: 'online' | 'offline' | 'break' | 'meeting';
  lastActivity: string;
  todayContacts: number;
  todayCollections: number;
  goalProgress: number; // Percentage toward daily goal
  avatar?: string;
}

export interface RecentActivity {
  id: string;
  type: 'collection' | 'promise' | 'contact' | 'goal_completed' | 'alert';
  collectorId: string;
  collectorName: string;
  description: string;
  timestamp: string;
  amount?: number;
  metadata?: Record<string, any>;
}

export interface UpcomingItem {
  id: string;
  type: 'goal_deadline' | 'review_scheduled' | 'report_due' | 'approval_needed';
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  assignedTo?: string;
}

export interface ManagerDashboard {
  snapshot: TodaySnapshot;
  criticalAlerts: CriticalAlert[];
  teamStatus: TeamStatusCollector[];
  recentActivity: RecentActivity[];
  upcomingItems: UpcomingItem[];
  businessHours: {
    start: number; // Hour 0-23
    end: number;   // Hour 0-23
  };
}

export const dashboardService = {
  /**
   * Get complete manager dashboard data
   */
  getManagerDashboard: async (
    orgId: string,
    params?: { teamId?: string },
    config?: AxiosRequestConfig
  ): Promise<ManagerDashboard> => {
    // Parallel fetch of real orchestrated data
    const [summary, teamOverview, activityFeed, notifications, goals, settingsResponse] = await Promise.all([
      analyticsService.getDashboardSummary(orgId, params, config),
      analyticsService.getTeamOverview(orgId, params, config),
      analyticsService.getActivityFeed(orgId, { pageSize: 20 }, config),
      notificationControllerGetNotifications(orgId, { pageSize: 10 }),
      goalsService.listGoals(orgId, { isActive: true }, config),
      settingsControllerGetSettings(orgId)
    ]);

    // 1. Calculate aggregated daily collections target from real-time goals
    const goalSum = (goals || [])
      .filter(g => g.type === GoalType.COLLECTIONS && g.period === GoalPeriod.DAILY)
      .reduce((sum, g) => sum + (Number(g.targetValue) || 0), 0);

    // 2. Use Organization-level business rule if no specific goals are active
    const settingsData = settingsResponse?.data && 'settings' in settingsResponse.data ? settingsResponse.data : null;
    const orgTarget = (settingsData?.settings as any)?.businessRules?.liquidationTargetDaily || 0;

    const dailyCollectionsTarget = goalSum > 0 ? goalSum : orgTarget;

    // 3. Extract business hours from settings (default 8am-9pm)
    const businessHours = (settingsData?.settings as any)?.businessHours || { start: 8, end: 21 };

    // 4. Map notifications to CriticalAlerts
    const criticalAlerts: CriticalAlert[] = (notifications?.data || [])
      .filter(n => ([
        NotificationResponseDtoType.MANAGER_ESCALATION,
        NotificationResponseDtoType.HIGH_PRIORITY_ITEM,
        NotificationResponseDtoType.FOLLOW_UP_DUE
      ] as NotificationResponseDtoType[]).includes(n.type))
      .map(n => ({
        id: n.id,
        type: n.type === NotificationResponseDtoType.MANAGER_ESCALATION ? 'compliance' : 'system',
        severity: n.type === NotificationResponseDtoType.MANAGER_ESCALATION ? 'critical' : 'warning',
        title: n.title,
        description: n.message,
        timestamp: n.createdAt,
        actionUrl: n.actionLink,
        actionLabel: 'View',
      }));

    // 5. Map goals with upcoming end dates to UpcomingItems
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const upcomingItems: UpcomingItem[] = (goals || [])
      .filter(g => g.endDate && new Date(g.endDate) > now && new Date(g.endDate) <= thirtyDaysFromNow)
      .map(g => ({
        id: g.id,
        type: 'goal_deadline',
        title: `Goal Deadline: ${g.name}`,
        description: `${g.type} goal ending soon.`,
        dueDate: g.endDate!,
        priority: new Date(g.endDate!) < new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7) ? 'high' : 'medium',
      }));

    return {
      snapshot: {
        totalCollections: summary.todayCollections || 0,
        totalContacts: summary.todayContacts || 0,
        promisesSecured: summary.todayPaymentPlans || 0,
        activeCollectors: teamOverview.teamTotals.activeCollectors,
        dailyCollectionsTarget: dailyCollectionsTarget,
        trends: {
          collections: dashboardService.calculateTrend(summary.todayCollections, summary.yesterdayCollections),
          contacts: dashboardService.calculateTrend(summary.todayContacts, summary.yesterdayContacts),
          promises: dashboardService.calculateTrend(summary.todayPaymentPlans, summary.yesterdayPaymentPlans),
        },
      },
      criticalAlerts,
      teamStatus: teamOverview.collectors.map(c => ({
        collectorId: c.userId,
        collectorName: c.fullName,
        status: c.status.toLowerCase() as any,
        lastActivity: c.lastActivity,
        todayContacts: c.performance.todayContacts,
        todayCollections: c.performance.todayCollected / 100, // Cents to Dollars
        goalProgress: c.performance.goalProgress,
      })),
      recentActivity: activityFeed.activities.map(a => ({
        id: a.id,
        type: dashboardService.mapActivityType(a.type),
        collectorId: a.metadata.userId,
        collectorName: a.metadata.userName,
        description: a.summary,
        timestamp: a.timestamp,
        amount: a.metadata.amount ? a.metadata.amount / 100 : undefined,
        metadata: a.metadata
      })),
      upcomingItems,
      businessHours,
    };
  },

  /**
   * Helper to calculate percentage trend between today and yesterday
   */
  calculateTrend(today: number, yesterday: number): number {
    if (!yesterday || yesterday === 0) return 0;
    return Math.round(((today - yesterday) / yesterday) * 100);
  },

  /**
   * Maps backend ActivityFeedType to UI RecentActivity type
   */
  mapActivityType(backendType: ActivityFeedType): RecentActivity['type'] {
    switch (backendType) {
      case ActivityFeedType.PAYMENT: return 'collection';
      case ActivityFeedType.OUTREACH: return 'contact';
      case ActivityFeedType.GOAL_ACHIEVED: return 'goal_completed';
      case ActivityFeedType.ESCALATION: return 'alert';
      default: return 'contact';
    }
  },

  /**
   * Get today's snapshot only
   */
  getTodaySnapshot: async (
    orgId: string,
    params?: { teamId?: string },
    config?: AxiosRequestConfig
  ): Promise<TodaySnapshot> => {
    const summary = await analyticsService.getDashboardSummary(orgId, params, config);
    const teamOverview = await analyticsService.getTeamOverview(orgId, params, config);

    return {
      totalCollections: summary.todayCollections || 0,
      totalContacts: summary.todayContacts || 0,
      promisesSecured: summary.todayPaymentPlans || 0,
      activeCollectors: teamOverview.teamTotals.activeCollectors,
      dailyCollectionsTarget: 0, // Not calculated for lightweight snapshot
      trends: { collections: 0, contacts: 0, promises: 0 }
    };
  },

  /**
   * Get critical alerts only
   */
  getCriticalAlerts: async (
    orgId: string,
    params?: { teamId?: string },
    config?: AxiosRequestConfig
  ): Promise<CriticalAlert[]> => {
    const dashboard = await dashboardService.getManagerDashboard(orgId, params, config);
    return dashboard.criticalAlerts;
  },

  /**
   * Get team status only
   */
  getTeamStatus: async (
    orgId: string,
    params?: { teamId?: string },
    config?: AxiosRequestConfig
  ): Promise<TeamStatusCollector[]> => {
    const teamOverview = await analyticsService.getTeamOverview(orgId, params, config);
    return teamOverview.collectors.map(c => ({
      collectorId: c.userId,
      collectorName: c.fullName,
      status: c.status.toLowerCase() as any,
      lastActivity: c.lastActivity,
      todayContacts: c.performance.todayContacts,
      todayCollections: c.performance.todayCollected / 100,
      goalProgress: c.performance.goalProgress,
    }));
  },

  /**
   * Get recent activity only
   */
  getRecentActivity: async (
    orgId: string,
    limit = 10,
    params?: { teamId?: string },
    config?: AxiosRequestConfig
  ): Promise<RecentActivity[]> => {
    const activityFeed = await analyticsService.getActivityFeed(orgId, { pageSize: limit }, config);
    return activityFeed.activities.map(a => ({
      id: a.id,
      type: dashboardService.mapActivityType(a.type),
      collectorId: a.metadata.userId,
      collectorName: a.metadata.userName,
      description: a.summary,
      timestamp: a.timestamp,
      amount: a.metadata.amount ? a.metadata.amount / 100 : undefined,
      metadata: a.metadata
    }));
  },

  /**
   * Get upcoming items only
   */
  getUpcomingItems: async (
    orgId: string,
    params?: { teamId?: string },
    config?: AxiosRequestConfig
  ): Promise<UpcomingItem[]> => {
    const dashboard = await dashboardService.getManagerDashboard(orgId, params, config);
    return dashboard.upcomingItems;
  },
};