import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { TeamsClientService } from '../core/services/teams-client.service';
import { TimeTrackingSession } from '../time-tracking/entities/time-tracking-session.entity';
import { CollectorProfile } from '../profiles/entities/collector-profile.entity';
import { CollectorDailyMetric } from '../performance/entities/collector-daily-metric.entity';
import { Goal } from '../goals/entities/goal.entity';
import { TimeTrackingSessionStatus, GoalScope, GoalPeriod } from '@verichron/enums';
import { 
  FloorStatusResponseDto, 
  CollectorFloorStatusDto, 
  TeamStatsDto 
} from './dto/floor-status-response.dto';

@Injectable()
export class FloorService {
  private readonly logger = new Logger(FloorService.name);

  constructor(
    @InjectRepository(TimeTrackingSession)
    private readonly sessionRepository: Repository<TimeTrackingSession>,
    @InjectRepository(CollectorProfile)
    private readonly profileRepository: Repository<CollectorProfile>,
    @InjectRepository(CollectorDailyMetric)
    private readonly metricRepository: Repository<CollectorDailyMetric>,
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
    private readonly teamsClient: TeamsClientService,
  ) {}

  /**
   * Get real-time floor status for a Team Lead
   * Scoped to the specific teams the user leads/belongs to.
   */
  async getFloorStatus(
    organizationId: string,
    userId: string,
    requestedTeamId?: string,
  ): Promise<FloorStatusResponseDto> {
    this.logger.log(`Fetching floor status for user ${userId} in org ${organizationId}`);

    // 1. Determine Scope: Which teams are we looking at?
    let teamIds: string[] = [];
    if (requestedTeamId) {
      teamIds = [requestedTeamId];
    } else {
      // Fetch all teams for this lead
      teamIds = await this.teamsClient.getUserTeams(userId, organizationId);
    }

    if (teamIds.length === 0) {
      return { collectors: [], teamStats: { totalCollected: 0, totalCalls: 0, avgGoalProgress: 0 } };
    }

    // 2. Get all members of these teams
    const allMembers = await Promise.all(
      teamIds.map(tid => this.teamsClient.getTeamMembers(organizationId, tid))
    );
    
    // Flatten and unique user IDs
    const collectorIds = Array.from(new Set(allMembers.flat().map(m => m.userId)));
    
    if (collectorIds.length === 0) {
      return { collectors: [], teamStats: { totalCollected: 0, totalCalls: 0, avgGoalProgress: 0 } };
    }

    // 3. Fetch Data in Parallel
    const todayStr = new Date().toISOString().split('T')[0];
    
    const [profiles, sessions, metrics, individualGoals] = await Promise.all([
      this.profileRepository.find({ where: { organizationId, userId: In(collectorIds) } }),
      this.sessionRepository.find({ 
        where: { organizationId, collectorUserId: In(collectorIds), status: In([TimeTrackingSessionStatus.ACTIVE, TimeTrackingSessionStatus.PAUSED]) } 
      }),
      this.metricRepository.find({ where: { organizationId, collectorUserId: In(collectorIds), date: todayStr } }),
      this.goalRepository.find({ 
        where: { organizationId, collectorUserId: In(collectorIds), scope: GoalScope.INDIVIDUAL, period: GoalPeriod.DAILY, isActive: true },
        relations: ['progress']
      })
    ]);

    // 4. Map to Collector Stats
    const collectors: CollectorFloorStatusDto[] = collectorIds.map(cid => {
      const profile = profiles.find(p => p.userId === cid);
      const session = sessions.find(s => s.collectorUserId === cid);
      const metric = metrics.find(m => m.collectorUserId === cid);
      const goal = individualGoals.find(g => g.collectorUserId === cid);

      let status: 'ACTIVE' | 'IDLE' | 'BREAK' | 'OFFLINE' = 'OFFLINE';
      if (session) {
        if (session.status === TimeTrackingSessionStatus.ACTIVE) status = 'ACTIVE';
        else if (session.status === TimeTrackingSessionStatus.PAUSED) status = 'BREAK';
        else status = 'IDLE';
      }

      const todayCollected = Number(metric?.totalCollected || 0);
      const todayGoal = Number(goal?.targetValue || 1000000); // Default $10k if no goal set
      
      return {
        id: cid,
        name: `Collector ${cid.substring(0, 5)}`, // Placeholder until we have User service integration
        status,
        currentDebtorName: session?.metadata?.currentDebtorName,
        todayCollected,
        todayGoal,
        callsToday: metric?.callsMade || 0,
        lastActivity: session?.lastActivityTime?.toISOString(),
      };
    });

    // 5. Calculate Team Aggregates
    const totalCollected = collectors.reduce((sum, c) => sum + c.todayCollected, 0);
    const totalCalls = collectors.reduce((sum, c) => sum + c.callsToday, 0);
    const totalProgress = collectors.reduce((sum, c) => {
      const pct = (c.todayCollected / c.todayGoal) * 100;
      return sum + Math.min(pct, 100);
    }, 0);
    const avgGoalProgress = collectors.length > 0 ? totalProgress / collectors.length : 0;

    return {
      collectors,
      teamStats: {
        totalCollected,
        totalCalls,
        avgGoalProgress: Math.round(avgGoalProgress),
      }
    };
  }
}
