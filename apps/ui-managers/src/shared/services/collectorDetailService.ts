import { usersApiClient, collectorsApiClient } from './apiClient.js';
import { goalsService } from './goalsService.js';
import { usersService } from './usersService.js';
import { collectorService } from './collectorService.js';
import { analyticsService } from './analyticsService.js';
import { collectorProfileControllerGetCollectorProfiles } from '../../api/generated/collectors/endpoints/collector-profiles/collector-profiles.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
import { NoteType, ContentFormat, type GoalType, type GoalPeriod, type GoalStatus } from '../../api/generated/collectors_models/index.js';

import { performanceService } from './performanceService.js';

export interface CollectorProfile {
  collectorId: string;
  collectorName: string;
  collectorEmail: string;
  avatar?: string;
  status: 'online' | 'offline' | 'break' | 'meeting';
  hireDate: string;
  role: string;
  phoneNumber?: string;
}

export interface PerformanceTimelinePoint {
  date: string;
  contacts: number;
  successfulContacts: number;
  promises: number;
  payments: number;
  totalCollected: number;
}

export interface CollectorGoalProgress {
  goalId: string;
  goalType: GoalType;
  period: GoalPeriod;
  target: number;
  current: number;
  progress: number; // Percentage
  daysRemaining?: number;
  status: GoalStatus;
}

export interface ActivityRecord {
  id: string;
  timestamp: string;
  type: 'call' | 'email' | 'sms' | 'payment' | 'promise' | 'note';
  debtorId: string;
  debtorName: string;
  outcome?: string;
  amount?: number;
  notes?: string;
  duration?: number; // For calls, in seconds
}

export interface PortfolioAssignment {
  portfolioId: string;
  portfolioName: string;
  accountsAssigned: number;
  accountsInProgress: number;
  accountsCompleted: number;
  totalDebt: number;
  collected: number;
  recoveryRate: number;
}

export interface ComparativeMetric {
  metric: string;
  collectorValue: number;
  teamAverage: number;
  percentile: number; // 0-100, where collector ranks
  rank: number;
  totalCollectors: number;
}

export interface SkillAssessment {
  category: string;
  strength: 'high' | 'medium' | 'low';
  description: string;
  metric?: string;
}

export interface CoachingNote {
  id: string;
  timestamp: string;
  authorId: string;
  authorName: string;
  noteType: 'feedback' | 'goal_setting' | 'performance_review' | 'one_on_one' | 'general';
  content: string;
  isPrivate: boolean;
}

export interface CollectorDetailData {
  profile: CollectorProfile;
  performanceTimeline: PerformanceTimelinePoint[];
  goalProgress: CollectorGoalProgress[];
  recentActivity: ActivityRecord[];
  portfolioAssignments: PortfolioAssignment[];
  comparativeAnalytics: ComparativeMetric[];
  skillAssessment: SkillAssessment[];
  coachingNotes: CoachingNote[];
}

export const collectorDetailService = {
  /**
   * Get complete collector detail data
   */
  getCollectorDetail: async (
    orgId: string,
    collectorId: string,
    config?: AxiosRequestConfig
  ): Promise<CollectorDetailData> => {
    // Calculate 30-day range for history
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Parallel fetch of real data
    const [user, realGoals, teamOverview, dashboardSummary, activityFeed, notesResponse, profiles, history] = await Promise.all([
      usersService.getUserById(orgId, collectorId, config),
      goalsService.getCollectorGoals(orgId, collectorId, config),
      analyticsService.getTeamOverview(orgId, {}, config),
      collectorService.getDashboardSummary(orgId, undefined, config), // org-wide for comparison
      analyticsService.getActivityFeed(orgId, { pageSize: 50 }, config), // Filtered later
      collectorsApiClient.get<any[]>(
        `/v1/collectors/notes/orgs/${orgId}/search`,
        {
          params: {
            targetUserId: collectorId,
            type: NoteType.COACHING
          },
          ...config
        }
      ),
      collectorProfileControllerGetCollectorProfiles(orgId, { userId: collectorId }),
      performanceService.getPerformanceHistory(orgId, collectorId, startDate, endDate, config)
    ]);
    
    // Find this specific collector in team overview for stats
    const collectorStats = teamOverview.collectors.find(c => c.userId === collectorId);
    
    // Get profile for skills
    const collectorProfile = profiles.data.length > 0 ? profiles.data[0] : null;

    // 1. Profile Data
    const profile: CollectorProfile = {
      collectorId: user.id,
      collectorName: `${user.firstName} ${user.lastName}`,
      collectorEmail: user.email,
      status: (collectorStats?.status.toLowerCase() as any) || 'offline',
      hireDate: user.createdAt,
      role: 'Collector',
      phoneNumber: user.phoneNumbers?.[0]?.phoneNumber,
    };

    // 2. Goal Progress
    const goalProgress: CollectorGoalProgress[] = await Promise.all(realGoals.map(async (g) => {
      const progress = await goalsService.getGoalProgress(orgId, g.id, config);
      return {
        goalId: g.id,
        goalType: g.type,
        period: g.period,
        target: Number(g.targetValue),
        current: progress.currentValue,
        progress: progress.progressPercentage,
        status: progress.status,
      };
    }));

    // 3. Coaching Notes
    const coachingNotes: CoachingNote[] = notesResponse.data.map((n: any) => ({
      id: n.id,
      timestamp: n.createdAt,
      authorId: n.collectorUserId,
      authorName: 'Manager',
      noteType: (n.metadata?.noteType) || 'general',
      content: n.content,
      isPrivate: n.metadata?.isPrivate || false,
    }));

    // 4. Recent Activity (Filter Feed by User)
    const recentActivity: ActivityRecord[] = activityFeed.activities
      .filter(a => a.metadata.userId === collectorId)
      .slice(0, 20)
      .map(a => ({
        id: a.id,
        timestamp: a.timestamp,
        type: collectorDetailService.mapActivityType(a.type),
        debtorId: a.metadata.debtorId || '',
        debtorName: a.metadata.debtorName || 'Unknown Debtor',
        outcome: undefined, // Not tracked in this DTO
        amount: a.metadata.amount ? a.metadata.amount / 100 : undefined,
        notes: a.summary,
      }));

    // 5. Comparative Analytics
    const totalCollectors = teamOverview.collectors.length;
    const comparativeAnalytics: ComparativeMetric[] = [
      { 
        metric: 'Contacts Today', 
        collectorValue: collectorStats?.performance.todayContacts || 0, 
        teamAverage: teamOverview.teamTotals.totalContacts / totalCollectors, 
        percentile: 80, // Mocked percentile
        rank: 3, 
        totalCollectors 
      },
      { 
        metric: 'Collected Today', 
        collectorValue: (collectorStats?.performance.todayCollected || 0) / 100, 
        teamAverage: (teamOverview.teamTotals.totalCollected / totalCollectors) / 100, 
        percentile: 75, 
        rank: 2, 
        totalCollectors 
      },
    ];

    // 6. Skill Assessment (From Real Profile)
    const skillAssessment: SkillAssessment[] = collectorProfile?.skills.map(skill => ({
      category: skill,
      strength: 'high', // Default since we don't have skill scoring yet
      description: `Tagged as expert in ${skill}`,
      metric: undefined
    })) || [];

    // 7. Portfolio Assignments (From Real Orchestrated Data)
    const portfolioAssignments: PortfolioAssignment[] = (collectorStats as any)?.portfolios?.map((p: any) => ({
      portfolioId: p.portfolioId,
      portfolioName: p.portfolioName,
      accountsAssigned: p.accountCount,
      accountsInProgress: p.accountCount, // Estimation
      accountsCompleted: 0,
      totalDebt: p.totalBalance,
      collected: 0,
      recoveryRate: 0,
    })) || [];

    // 8. Performance Timeline (From Real Accumulator)
    const performanceTimeline: PerformanceTimelinePoint[] = history.map(h => ({
      date: h.date,
      contacts: h.uniqueAccountsContacted,
      successfulContacts: h.uniqueAccountsContacted, // Simplified mapping
      promises: h.promisesSecured,
      payments: h.paymentsReceived,
      totalCollected: Number(h.totalCollected) / 100,
    }));

    return {
      profile,
      performanceTimeline,
      goalProgress,
      recentActivity,
      portfolioAssignments,
      comparativeAnalytics,
      skillAssessment,
      coachingNotes,
    };
  },

  /**
   * Map ActivityFeedType to ActivityRecord type
   */
  mapActivityType(type: any): ActivityRecord['type'] {
    switch (type) {
      case 'PAYMENT': return 'payment';
      case 'OUTREACH': return 'call';
      case 'PROMISE_MADE': return 'promise';
      case 'NOTE': return 'note';
      default: return 'call';
    }
  },

  /**
   * Add coaching note
   */
  addCoachingNote: async (
    orgId: string,
    collectorId: string,
    note: Omit<CoachingNote, 'id' | 'timestamp' | 'authorId' | 'authorName'>,
    config?: AxiosRequestConfig
  ): Promise<CoachingNote> => {
    const response = await collectorsApiClient.post<any>(
      `/v1/collectors/notes/orgs/${orgId}`,
      {
        type: NoteType.COACHING,
        targetUserId: collectorId,
        content: note.content,
        contentFormat: ContentFormat.PLAINTEXT,
        metadata: {
          noteType: note.noteType,
          isPrivate: note.isPrivate
        }
      },
      config
    );

    const n = response.data;
    return {
      id: n.id,
      timestamp: n.createdAt,
      authorId: n.collectorUserId,
      authorName: 'Manager',
      noteType: n.metadata?.noteType,
      content: n.content,
      isPrivate: n.metadata?.isPrivate,
    };
  },

  /**
   * Update coaching note
   */
  updateCoachingNote: async (
    orgId: string,
    collectorId: string,
    noteId: string,
    updates: Partial<CoachingNote>,
    config?: AxiosRequestConfig
  ): Promise<CoachingNote> => {
    const response = await collectorsApiClient.patch<any>(
      `/v1/collectors/notes/orgs/${orgId}/${noteId}`,
      {
        content: updates.content,
        metadata: {
          noteType: updates.noteType,
          isPrivate: updates.isPrivate
        }
      },
      config
    );

    const n = response.data;
    return {
      id: n.id,
      timestamp: n.createdAt,
      authorId: n.collectorUserId,
      authorName: 'Manager',
      noteType: n.metadata?.noteType,
      content: n.content,
      isPrivate: n.metadata?.isPrivate,
    };
  },

  /**
   * Delete coaching note
   */
  deleteCoachingNote: async (
    orgId: string,
    collectorId: string,
    noteId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    await collectorsApiClient.delete(
      `/v1/collectors/notes/orgs/${orgId}/${noteId}`,
      config
    );
  },
};
