import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import {
  Goal,
  GoalProgress,
} from './entities';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { GoalProgressResponseDto } from './dto/goal-progress-response.dto';
import { TeamsClientService } from '../core/services/teams-client.service';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { GoalScope, GoalType, GoalStatus, GoalPeriod } from '@verichron/enums';
import { GoalCreatedDto, GoalUpdatedDto, GoalDeletedDto, GoalProgressUpdatedDto } from '../events/event-dto';
import { 
  endOfDay, 
  endOfWeek, 
  endOfMonth, 
  endOfQuarter 
} from 'date-fns';

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(
    @InjectRepository(Goal)
    private readonly goalRepository: Repository<Goal>,
    @InjectRepository(GoalProgress)
    private readonly progressRepository: Repository<GoalProgress>,
    private readonly teamsClient: TeamsClientService,
    private readonly eventPublisher: EventPublisher,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new goal with its initial progress accumulator
   */
  async createGoal(
    organizationId: string,
    dto: CreateGoalDto,
    creatorId: string,
  ): Promise<GoalResponseDto> {
    // 1. Validate Scope
    if (dto.scope === GoalScope.TEAM && !dto.teamId) {
      throw new BadRequestException('Team ID is required for TEAM scope goals');
    }
    if (dto.scope === GoalScope.INDIVIDUAL && !dto.collectorUserId) {
      throw new BadRequestException('Collector User ID is required for INDIVIDUAL scope goals');
    }

    // 2. Validate Team Existence (if applicable)
    if (dto.teamId) {
      const teamExists = await this.teamsClient.verifyTeamBelongsToOrg(
        dto.teamId,
        organizationId,
      );
      if (!teamExists) {
        throw new BadRequestException('Invalid Team ID for this organization');
      }
    }

    // 3. Create Goal & Progress Transactionally
    const goal = await this.dataSource.transaction(async (manager) => {
      // Create Goal
      const newGoal = manager.create(Goal, {
        ...dto,
        organizationId,
        createdBy: creatorId,
      });
      const savedGoal = await manager.save(newGoal);

      // Create Accumulator (starts at 0)
      const progress = manager.create(GoalProgress, {
        goalId: savedGoal.id,
        currentValue: 0,
      });
      await manager.save(progress);

      return savedGoal;
    });

    // 4. Publish Event
    await this.eventPublisher.publish(
      EVENT_TYPES.COLLECTORS_GOAL_CREATED,
      {
        goalId: goal.id,
        organizationId,
        scope: goal.scope,
        type: goal.type,
        period: goal.period,
        targetValue: Number(goal.targetValue),
        unit: goal.unit,
        name: goal.name,
        startDate: goal.startDate,
        endDate: goal.endDate,
        teamId: goal.teamId,
        collectorUserId: goal.collectorUserId,
        createdBy: creatorId,
      },
      GoalCreatedDto,
    );

    return new GoalResponseDto(goal);
  }

  /**
   * Increment progress for all matching active goals.
   * This is the high-performance method called by Event Listeners.
   * 
   * @param collectorId The user performing the action
   * @param type The metric type (e.g., REVENUE, CALLS)
   * @param value The amount to increment (e.g., $100.00 or 1 call)
   */
  async incrementProgress(
    organizationId: string,
    collectorId: string,
    type: GoalType,
    value: number,
  ): Promise<void> {
    // 1. Get user's teams to match Team Goals
    const teamIds = await this.teamsClient.getUserTeams(collectorId, organizationId);

    // 2. Find all ACTIVE goals matching this criteria
    //    - Same Organization
    //    - Same Metric Type
    //    - Date is within Start/End range
    //    - Scope matches (Individual OR one of the User's Teams)
    const now = new Date();
    
    const matchingGoals = await this.goalRepository.find({
      where: [
        // Individual Goals
        {
          organizationId,
          type,
          isActive: true,
          scope: GoalScope.INDIVIDUAL,
          collectorUserId: collectorId,
          // We'll filter dates in JS or use more complex query builder if needed
        },
        // Team Goals
        {
          organizationId,
          type,
          isActive: true,
          scope: GoalScope.TEAM,
          teamId: In(teamIds.length ? teamIds : ['non-existent-id']),
        },
      ],
      relations: ['progress'],
    });

    // 3. Filter by Date Range (in-memory for simplicity, or move to QueryBuilder)
    const activeGoals = matchingGoals.filter(g => {
      const start = new Date(g.startDate);
      const end = g.endDate ? new Date(g.endDate) : this.calculateEndDate(g.period, start);
      return now >= start && now <= end;
    });

    if (activeGoals.length === 0) return;

    // 4. Batch Update Progress
    // We use direct SQL update for atomicity and performance: 
    // "UPDATE goal_progress SET current_value = current_value + X WHERE id IN (...)"
    const goalIds = activeGoals.map(g => g.id);
    
    await this.progressRepository
      .createQueryBuilder()
      .update(GoalProgress)
      .set({
        currentValue: () => `current_value + ${value}`,
      })
      .where('goal_id IN (:...ids)', { ids: goalIds })
      .execute();

    this.logger.debug(`Incremented ${activeGoals.length} goals by ${value} for user ${collectorId}`);
    
    // 5. Publish Progress Update Events
    // Fetch fresh progress for all updated goals to ensure accurate percentages in the event
    for (const goalId of goalIds) {
      const progress = await this.getGoalProgress(goalId);
      await this.eventPublisher.publish(
        EVENT_TYPES.COLLECTORS_GOAL_PROGRESS_UPDATED,
        {
          goalId: progress.goalId,
          organizationId,
          currentValue: progress.currentValue,
          targetValue: progress.targetValue,
          progressPercentage: progress.progressPercentage,
          status: progress.status as GoalStatus,
          lastUpdated: progress.lastUpdated,
        },
        GoalProgressUpdatedDto,
      );
    }
  }

  /**
   * Helper to increment progress by debtor ID (finds assigned collector)
   */
  async incrementProgressByDebtor(
    organizationId: string,
    debtorId: string,
    type: GoalType,
    value: number,
  ): Promise<void> {
    // Find who is assigned to this debtor
    // We can query WorkQueueItem or CollectorAction history
    // For now, we check the WorkQueueItem table
    const result = await this.dataSource.query(
      `SELECT assigned_to_user_id FROM work_queue_items 
       WHERE organization_id = $1 AND debtor_id = $2 
       AND status != 'COMPLETED' LIMIT 1`,
      [organizationId, debtorId]
    );

    const collectorId = result[0]?.assigned_to_user_id;

    if (collectorId) {
      await this.incrementProgress(organizationId, collectorId, type, value);
    } else {
      this.logger.warn(`Could not attribute ${type} goal progress for debtor ${debtorId}: No assigned collector found`);
    }
  }

  /**
   * Calculate effective end date if not provided
   */
  private calculateEndDate(period: GoalPeriod, startDate: Date): Date {
    switch (period) {
      case GoalPeriod.DAILY: return endOfDay(startDate);
      case GoalPeriod.WEEKLY: return endOfWeek(startDate);
      case GoalPeriod.MONTHLY: return endOfMonth(startDate);
      case GoalPeriod.QUARTERLY: return endOfQuarter(startDate);
      default: return endOfMonth(startDate); // Fallback
    }
  }

  /**
   * Get Goal with real-time progress
   */
  async getGoalProgress(goalId: string): Promise<GoalProgressResponseDto> {
    const goal = await this.goalRepository.findOne({
      where: { id: goalId },
      relations: ['progress'],
    });

    if (!goal) throw new NotFoundException('Goal not found');

    const current = Number(goal.progress?.currentValue || 0);
    const target = Number(goal.targetValue);
    const pct = target > 0 ? (current / target) * 100 : 0;

    return new GoalProgressResponseDto({
      goalId: goal.id,
      currentValue: current,
      targetValue: target,
      progressPercentage: parseFloat(pct.toFixed(2)),
      status: this.determineStatus(pct, goal.startDate, goal.endDate || this.calculateEndDate(goal.period, goal.startDate)),
      lastUpdated: goal.progress?.lastUpdated || goal.updatedAt,
    });
  }

  private determineStatus(pct: number, start: Date, end: Date): GoalStatus {
    const now = new Date();
    if (pct >= 100) return GoalStatus.ACHIEVED;
    if (now > end) return GoalStatus.MISSED;
    
    // Time elapsed calculation for "At Risk"
    const totalTime = end.getTime() - start.getTime();
    const elapsedTime = now.getTime() - start.getTime();
    const timePct = (elapsedTime / totalTime) * 100;

    // If we are 20% behind schedule
    if (pct < (timePct - 20)) return GoalStatus.AT_RISK;
    
    return GoalStatus.IN_PROGRESS;
  }

  async listGoals(organizationId: string, query: any): Promise<GoalResponseDto[]> {
    // Basic implementation with progress relation join
    const goals = await this.goalRepository.find({
      where: { organizationId, ...query },
      relations: ['progress'],
      order: { createdAt: 'DESC' }
    });

    return goals.map(g => {
      const current = Number(g.progress?.currentValue || 0);
      const target = Number(g.targetValue);
      const pct = target > 0 ? (current / target) * 100 : 0;

      return new GoalResponseDto({
        ...g,
        currentValue: current,
        progressPercentage: parseFloat(pct.toFixed(2)),
      });
    });
  }

  async deleteGoal(organizationId: string, goalId: string, userId: string): Promise<void> {
    const goal = await this.goalRepository.findOne({ where: { id: goalId, organizationId } });
    if (!goal) throw new NotFoundException('Goal not found');

    goal.isActive = false;
    goal.isArchived = true;
    await this.goalRepository.save(goal);

    await this.eventPublisher.publish(
        EVENT_TYPES.COLLECTORS_GOAL_DELETED,
        { goalId, organizationId, deletedBy: userId },
        GoalDeletedDto,
    );
  }

    async updateGoal(organizationId: string, goalId: string, dto: UpdateGoalDto, userId: string): Promise<GoalResponseDto> {
    const goal = await this.goalRepository.findOne({ where: { id: goalId, organizationId } });
    if (!goal) throw new NotFoundException('Goal not found');

    Object.assign(goal, dto);
    const updated = await this.goalRepository.save(goal);

    await this.eventPublisher.publish(
        EVENT_TYPES.COLLECTORS_GOAL_UPDATED,
        { 
            goalId, 
            organizationId, 
            updatedBy: userId,
            ...dto,
            startDate: dto.startDate ? new Date(dto.startDate) : undefined,
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        },
        GoalUpdatedDto,
    );

    return new GoalResponseDto(updated);
  }
}
