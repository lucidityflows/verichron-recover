import { Injectable, Logger, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Team } from './entities/team.entity';
import { TeamMember } from './entities/team-member.entity';
import { PortfolioTeamAssignment } from './entities/portfolio-team-assignment.entity';
import { TeamMemberRole } from '@verichron/enums';
import {
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
  TeamResponseDto,
  TeamMemberResponseDto,
} from './dto';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import {
  TeamCreatedDto,
  TeamUpdatedDto,
  TeamDeletedDto,
  TeamMemberAddedDto,
  TeamMemberRemovedDto,
  PortfolioAssignedToTeamDto,
  PortfolioUnassignedFromTeamDto,
} from '../events/event-dto';
import { REDIS_CLIENT } from '../core/redis';
import type Redis from 'ioredis';

/**
 * Teams service handles all team management business logic including:
 * - Team CRUD operations
 * - Multi-team membership management
 * - Primary team designation
 * - Portfolio-Team assignments (many-to-many)
 * - Event publishing for team lifecycle
 */
@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
    @InjectRepository(PortfolioTeamAssignment)
    private readonly portfolioAssignmentRepository: Repository<PortfolioTeamAssignment>,
    private readonly eventPublisher: EventPublisher,
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  // ============================================================================
  // Team CRUD Operations
  // ============================================================================

  /**
   * Create a new team
   */
  async createTeam(organizationId: string, dto: CreateTeamDto): Promise<TeamResponseDto> {
    this.logger.log(`Creating team "${dto.name}" for organization ${organizationId}`);

    // Check if team with same name already exists in this organization
    const existing = await this.teamRepository.findOne({
      where: { organizationId, name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Team with name "${dto.name}" already exists in this organization`);
    }

    // Create team entity
    const team = this.teamRepository.create({
      organizationId,
      name: dto.name,
      description: dto.description,
      managerUserId: dto.managerUserId,
    });

    const savedTeam = await this.teamRepository.save(team);

    // Publish TEAM_CREATED event
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TEAMS_TEAM_CREATED,
        {
          teamId: savedTeam.id,
          organizationId: savedTeam.organizationId,
          name: savedTeam.name,
          managerUserId: savedTeam.managerUserId,
          createdAt: savedTeam.createdAt.toISOString(),
        },
        TeamCreatedDto,
      );
    } catch (error) {
      this.logger.error(`Failed to publish TEAM_CREATED event for team ${savedTeam.id}`, error);
      // Don't throw - team was created successfully, event publishing is secondary
    }

    return this.mapToTeamResponseDto(savedTeam, 0);
  }

  /**
   * Get all teams for an organization
   */
  async getTeams(organizationId: string): Promise<TeamResponseDto[]> {
    this.logger.log(`Fetching teams for organization ${organizationId}`);

    const teams = await this.teamRepository.find({
      where: { organizationId },
      order: { name: 'ASC' },
    });

    // Get member counts for each team
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const memberCount = await this.teamMemberRepository.count({
          where: { teamId: team.id },
        });
        return this.mapToTeamResponseDto(team, memberCount);
      }),
    );

    return teamsWithCounts;
  }

  /**
   * Get a single team by ID
   */
  async getTeamById(organizationId: string, teamId: string): Promise<TeamResponseDto> {
    this.logger.log(`Fetching team ${teamId} for organization ${organizationId}`);

    const team = await this.teamRepository.findOne({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    const memberCount = await this.teamMemberRepository.count({
      where: { teamId: team.id },
    });

    return this.mapToTeamResponseDto(team, memberCount);
  }

  /**
   * Update a team
   */
  async updateTeam(organizationId: string, teamId: string, dto: UpdateTeamDto): Promise<TeamResponseDto> {
    this.logger.log(`Updating team ${teamId} for organization ${organizationId}`);

    const team = await this.teamRepository.findOne({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    // Check for name conflicts if name is being changed
    if (dto.name && dto.name !== team.name) {
      const existing = await this.teamRepository.findOne({
        where: { organizationId, name: dto.name },
      });

      if (existing) {
        throw new ConflictException(`Team with name "${dto.name}" already exists in this organization`);
      }
    }

    // Update team fields
    if (dto.name !== undefined) team.name = dto.name;
    if (dto.description !== undefined) team.description = dto.description;
    if (dto.managerUserId !== undefined) team.managerUserId = dto.managerUserId;

    const savedTeam = await this.teamRepository.save(team);

    // Publish TEAM_UPDATED event
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TEAMS_TEAM_UPDATED,
        {
          teamId: savedTeam.id,
          organizationId: savedTeam.organizationId,
          name: savedTeam.name,
          managerUserId: savedTeam.managerUserId,
          updatedAt: savedTeam.updatedAt.toISOString(),
        },
        TeamUpdatedDto,
      );
    } catch (error) {
      this.logger.error(`Failed to publish TEAM_UPDATED event for team ${savedTeam.id}`, error);
    }

    const memberCount = await this.teamMemberRepository.count({
      where: { teamId: savedTeam.id },
    });

    return this.mapToTeamResponseDto(savedTeam, memberCount);
  }

  /**
   * Delete a team
   */
  async deleteTeam(organizationId: string, teamId: string): Promise<void> {
    this.logger.log(`Deleting team ${teamId} for organization ${organizationId}`);

    const team = await this.teamRepository.findOne({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    await this.teamRepository.remove(team);

    // Publish TEAM_DELETED event
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TEAMS_TEAM_DELETED,
        {
          teamId,
          organizationId,
          deletedAt: new Date().toISOString(),
        },
        TeamDeletedDto,
      );
    } catch (error) {
      this.logger.error(`Failed to publish TEAM_DELETED event for team ${teamId}`, error);
    }
  }

  // ============================================================================
  // Team Member Operations
  // ============================================================================

  /**
   * Add a member to a team
   */
  async addTeamMember(
    organizationId: string,
    teamId: string,
    dto: AddTeamMemberDto,
  ): Promise<TeamMemberResponseDto> {
    this.logger.log(`Adding user ${dto.userId} to team ${teamId}`);

    // Verify team exists and belongs to organization
    const team = await this.teamRepository.findOne({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    // Check if user is already a member
    const existingMember = await this.teamMemberRepository.findOne({
      where: { teamId, userId: dto.userId },
    });

    if (existingMember) {
      throw new ConflictException(`User ${dto.userId} is already a member of team ${teamId}`);
    }

    // If this is being set as primary, unset other primary teams for this user
    if (dto.isPrimary) {
      await this.dataSource.transaction(async (manager) => {
        // Unset all primary flags for this user in this organization
        await manager
          .createQueryBuilder()
          .update(TeamMember)
          .set({ isPrimary: false })
          .where('userId = :userId', { userId: dto.userId })
          .andWhere('teamId IN (SELECT id FROM teams WHERE organization_id = :organizationId)', {
            organizationId,
          })
          .execute();

        // Create new team member with isPrimary = true
        const teamMember = manager.create(TeamMember, {
          teamId,
          userId: dto.userId,
          isPrimary: true,
          roleOnTeam: dto.roleOnTeam || TeamMemberRole.MEMBER,
        });

        await manager.save(teamMember);
      });
    } else {
      // Create team member without transaction
      const teamMember = this.teamMemberRepository.create({
        teamId,
        userId: dto.userId,
        isPrimary: dto.isPrimary || false,
        roleOnTeam: dto.roleOnTeam || TeamMemberRole.MEMBER,
      });

      await this.teamMemberRepository.save(teamMember);
    }

    // Invalidate collectors cache (fire and forget)
    this.invalidateCollectorsCache(organizationId).catch((err) => {
      this.logger.error(`Cache invalidation failed for org ${organizationId}`, err);
    });

    // Publish TEAM_MEMBER_ADDED event
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TEAMS_MEMBER_ADDED,
        {
          teamId,
          organizationId,
          userId: dto.userId,
          roleOnTeam: dto.roleOnTeam || TeamMemberRole.MEMBER,
          isPrimary: dto.isPrimary || false,
          addedAt: new Date().toISOString(),
        },
        TeamMemberAddedDto,
      );
    } catch (error) {
      this.logger.error(`Failed to publish TEAM_MEMBER_ADDED event`, error);
    }

    // Fetch and return the created member
    const savedMember = await this.teamMemberRepository.findOne({
      where: { teamId, userId: dto.userId },
    });

    return this.mapToTeamMemberResponseDto(savedMember!);
  }

  /**
   * Get all team members for an organization
   */
  async getTeamMembers(organizationId: string, teamId: string): Promise<TeamMemberResponseDto[]> {
    this.logger.log(`Fetching members for team ${teamId}`);

    // Verify team exists and belongs to organization
    const team = await this.teamRepository.findOne({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    const members = await this.teamMemberRepository.find({
      where: { teamId },
      order: { joinedAt: 'ASC' },
    });

    return members.map((member) => this.mapToTeamMemberResponseDto(member));
  }

  /**
   * Get a map of userId to teamId/teamName for all members in the organization.
   * Used as a "Bridge" for cross-context UI joins.
   */
  async getMembershipMap(organizationId: string): Promise<Record<string, { teamId: string; teamName: string }>> {
    this.logger.log(`Fetching membership map for organization ${organizationId}`);

    const members = await this.teamMemberRepository
      .createQueryBuilder('tm')
      .innerJoinAndSelect('tm.team', 't')
      .where('t.organizationId = :organizationId', { organizationId })
      .getMany();

    const map: Record<string, { teamId: string; teamName: string }> = {};
    for (const m of members) {
      map[m.userId] = {
        teamId: m.teamId,
        teamName: m.team.name,
      };
    }

    return map;
  }

  /**
   * Get all teams for a specific user
   */
  async getUserTeams(organizationId: string, userId: string): Promise<TeamResponseDto[]> {
    this.logger.log(`Fetching teams for user ${userId} in organization ${organizationId}`);

    // Get all team memberships for this user
    const memberships = await this.teamMemberRepository.find({
      where: { userId },
      relations: ['team'],
    });

    // Filter to only teams in this organization
    const teamsInOrg = memberships
      .map((m) => m.team)
      .filter((team) => team?.organizationId === organizationId);

    // Get member counts for each team
    const teamsWithCounts = await Promise.all(
      teamsInOrg.map(async (team) => {
        const memberCount = await this.teamMemberRepository.count({
          where: { teamId: team.id },
        });
        return this.mapToTeamResponseDto(team, memberCount);
      }),
    );

    return teamsWithCounts;
  }

  /**
   * Remove a member from a team
   */
  async removeTeamMember(organizationId: string, teamId: string, userId: string): Promise<void> {
    this.logger.log(`Removing user ${userId} from team ${teamId}`);

    // Verify team exists and belongs to organization
    const team = await this.teamRepository.findOne({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    const member = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
    });

    if (!member) {
      throw new NotFoundException(`User ${userId} is not a member of team ${teamId}`);
    }

    await this.teamMemberRepository.remove(member);

    // Invalidate collectors cache (fire and forget)
    this.invalidateCollectorsCache(organizationId).catch((err) => {
      this.logger.error(`Cache invalidation failed for org ${organizationId}`, err);
    });

    // Publish TEAM_MEMBER_REMOVED event
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.TEAMS_MEMBER_REMOVED,
        {
          teamId,
          organizationId,
          userId,
          removedAt: new Date().toISOString(),
        },
        TeamMemberRemovedDto,
      );
    } catch (error) {
      this.logger.error(`Failed to publish TEAM_MEMBER_REMOVED event`, error);
    }
  }

  /**
   * Update a team member's role or primary status
   */
  async updateTeamMember(
    organizationId: string,
    teamId: string,
    userId: string,
    updates: Partial<Pick<TeamMember, 'isPrimary' | 'roleOnTeam'>>,
  ): Promise<TeamMemberResponseDto> {
    this.logger.log(`Updating membership for user ${userId} in team ${teamId}`);

    // Verify team exists and belongs to organization
    const team = await this.teamRepository.findOne({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    const member = await this.teamMemberRepository.findOne({
      where: { teamId, userId },
    });

    if (!member) {
      throw new NotFoundException(`User ${userId} is not a member of team ${teamId}`);
    }

    // If setting as primary, unset other primary teams
    if (updates.isPrimary === true && !member.isPrimary) {
      await this.dataSource.transaction(async (manager) => {
        // Unset all primary flags for this user in this organization
        await manager
          .createQueryBuilder()
          .update(TeamMember)
          .set({ isPrimary: false })
          .where('userId = :userId', { userId })
          .andWhere('teamId IN (SELECT id FROM teams WHERE organization_id = :organizationId)', {
            organizationId,
          })
          .execute();

        // Set this one as primary
        member.isPrimary = true;
        if (updates.roleOnTeam !== undefined) {
          member.roleOnTeam = updates.roleOnTeam;
        }
        await manager.save(member);
      });
    } else {
      // Simple update
      if (updates.isPrimary !== undefined) {
        member.isPrimary = updates.isPrimary;
      }
      if (updates.roleOnTeam !== undefined) {
        member.roleOnTeam = updates.roleOnTeam;
      }
      await this.teamMemberRepository.save(member);
    }

    // Invalidate collectors cache if role changed (fire and forget)
    if (updates.roleOnTeam !== undefined) {
      this.invalidateCollectorsCache(organizationId).catch((err) => {
        this.logger.error(`Cache invalidation failed for org ${organizationId}`, err);
      });
    }

    return this.mapToTeamMemberResponseDto(member);
  }

  // ============================================================================
  // Internal Service Methods (for service-to-service calls)
  // ============================================================================

  /**
   * Verify if a team belongs to an organization (internal use)
   */
  async verifyTeamBelongsToOrg(teamId: string, organizationId: string): Promise<boolean> {
    const count = await this.teamRepository.count({
      where: { id: teamId, organizationId },
    });
    return count > 0;
  }

  /**
   * Verify if a user is a member of a team (internal use)
   */
  async verifyUserIsTeamMember(userId: string, teamId: string): Promise<boolean> {
    const count = await this.teamMemberRepository.count({
      where: { userId, teamId },
    });
    return count > 0;
  }

  /**
   * Get a user's primary team ID (internal use)
   */
  async getUserPrimaryTeamId(userId: string, organizationId: string): Promise<string | null> {
    const primaryMembership = await this.teamMemberRepository.findOne({
      where: { userId, isPrimary: true },
      relations: ['team'],
    });

    if (primaryMembership?.team.organizationId === organizationId) {
      return primaryMembership.teamId;
    }

    return null;
  }

  /**
   * Get all collector user IDs for an organization (internal use)
   *
   * Redis-backed cache with database fallback.
   * Cache key: org:{orgId}:collectors
   *
   * Performance:
   * - Cache hit: ~5-10ms (Redis SMEMBERS)
   * - Cache miss: ~50-100ms (PostgreSQL JOIN + cache warm)
   */
  async getCollectorsByOrganization(organizationId: string): Promise<string[]> {
    const cacheKey = `org:${organizationId}:collectors`;

    try {
      // Try Redis cache first
      const cached = await this.redis.smembers(cacheKey);
      if (cached && cached.length > 0) {
        this.logger.log(`✅ Redis cache HIT: ${cached.length} collectors for org ${organizationId}`);
        return cached;
      }

      this.logger.log(`⚠️ Redis cache MISS for org ${organizationId}, querying database...`);
    } catch (error) {
      this.logger.error(`Redis read error for org ${organizationId}, falling back to database`, error);
    }

    // Cache miss or Redis error - query database
    const result = await this.teamMemberRepository
      .createQueryBuilder('tm')
      .select('DISTINCT tm.userId', 'userId')
      .innerJoin('tm.team', 't')
      .where('t.organizationId = :organizationId', { organizationId })
      .andWhere('tm.roleOnTeam IN (:...roles)', {
        roles: [TeamMemberRole.MEMBER, TeamMemberRole.LEAD],
      })
      .getRawMany();

    const collectorIds = result.map((row) => row.userId);
    this.logger.log(`Found ${collectorIds.length} collectors in database for org ${organizationId}`);

    // Warm the cache for next request (fire and forget)
    if (collectorIds.length > 0) {
      this.warmCollectorsCache(organizationId, collectorIds).catch((err) => {
        this.logger.error(`Failed to warm cache for org ${organizationId}`, err);
      });
    }

    return collectorIds;
  }

  /**
   * Warm the Redis cache with collector IDs
   * Private helper method - called after database queries
   */
  private async warmCollectorsCache(organizationId: string, collectorIds: string[]): Promise<void> {
    const cacheKey = `org:${organizationId}:collectors`;
    try {
      // Use pipeline for atomic operation
      const pipeline = this.redis.pipeline();
      pipeline.del(cacheKey); // Clear existing set
      if (collectorIds.length > 0) {
        pipeline.sadd(cacheKey, ...collectorIds); // Add all collector IDs
      }
      pipeline.expire(cacheKey, 3600); // 1 hour TTL as safety net
      await pipeline.exec();
      this.logger.log(`🔥 Warmed cache for org ${organizationId} with ${collectorIds.length} collectors`);
    } catch (error) {
      this.logger.error(`Failed to warm cache for org ${organizationId}`, error);
      throw error;
    }
  }

  /**
   * Invalidate the collectors cache for an organization
   * Called when team membership changes
   */
  private async invalidateCollectorsCache(organizationId: string): Promise<void> {
    const cacheKey = `org:${organizationId}:collectors`;
    try {
      await this.redis.del(cacheKey);
      this.logger.log(`🗑️ Invalidated collectors cache for org ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to invalidate cache for org ${organizationId}`, error);
      // Don't throw - cache invalidation failure shouldn't break the operation
    }
  }

  // ============================================================================
  // Mapper Methods
  // ============================================================================

  private mapToTeamResponseDto(team: Team, memberCount: number): TeamResponseDto {
    return {
      id: team.id,
      organizationId: team.organizationId,
      name: team.name,
      description: team.description,
      managerUserId: team.managerUserId,
      memberCount,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
    };
  }

  private mapToTeamMemberResponseDto(member: TeamMember): TeamMemberResponseDto {
    return {
      teamId: member.teamId,
      userId: member.userId,
      isPrimary: member.isPrimary,
      roleOnTeam: member.roleOnTeam,
      joinedAt: member.joinedAt.toISOString(),
    };
  }

  // ============================================================================
  // Portfolio Assignment Operations
  // ============================================================================

  /**
   * Assign a portfolio to a team
   */
  async assignPortfolioToTeam(
    organizationId: string,
    portfolioId: string,
    teamId: string,
  ): Promise<PortfolioTeamAssignment> {
    this.logger.log(`Assigning portfolio ${portfolioId} to team ${teamId}`);

    // Verify team exists and belongs to organization
    const team = await this.teamRepository.findOne({
      where: { id: teamId, organizationId },
    });

    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found`);
    }

    // Check if assignment already exists
    const existing = await this.portfolioAssignmentRepository.findOne({
      where: { organizationId, portfolioId, teamId },
    });

    if (existing) {
      return existing;
    }

    const assignment = this.portfolioAssignmentRepository.create({
      organizationId,
      portfolioId,
      teamId,
    });

    const saved = await this.portfolioAssignmentRepository.save(assignment);

    // Publish event
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.ORGANIZATIONS_PORTFOLIO_ASSIGNED_TO_TEAM,
        {
          organizationId,
          portfolioId,
          teamId,
          assignedAt: saved.assignedAt.toISOString(),
        },
        PortfolioAssignedToTeamDto,
      );
    } catch (error) {
      this.logger.error(`Failed to publish PORTFOLIO_ASSIGNED_TO_TEAM event`, error);
    }

    return saved;
  }

  /**
   * Remove a portfolio from a team
   */
  async removePortfolioFromTeam(
    organizationId: string,
    portfolioId: string,
    teamId: string,
  ): Promise<void> {
    this.logger.log(`Removing portfolio ${portfolioId} from team ${teamId}`);

    const assignment = await this.portfolioAssignmentRepository.findOne({
      where: { organizationId, portfolioId, teamId },
    });

    if (!assignment) {
      return;
    }

    await this.portfolioAssignmentRepository.remove(assignment);

    // Publish event
    try {
      await this.eventPublisher.publish(
        EVENT_TYPES.ORGANIZATIONS_PORTFOLIO_UNASSIGNED_FROM_TEAM,
        {
          organizationId,
          portfolioId,
          teamId,
          unassignedAt: new Date().toISOString(),
        },
        PortfolioUnassignedFromTeamDto,
      );
    } catch (error) {
      this.logger.error(`Failed to publish PORTFOLIO_UNASSIGNED_FROM_TEAM event`, error);
    }
  }

  /**
   * Get all portfolios assigned to a specific team
   */
  async getPortfoliosForTeam(organizationId: string, teamId: string): Promise<PortfolioTeamAssignment[]> {
    return this.portfolioAssignmentRepository.find({
      where: { organizationId, teamId },
    });
  }

  /**
   * Get all teams assigned to a specific portfolio
   */
  async getTeamsForPortfolio(organizationId: string, portfolioId: string): Promise<Team[]> {
    const assignments = await this.portfolioAssignmentRepository.find({
      where: { organizationId, portfolioId },
      relations: ['team'],
    });

    return assignments.map((a) => a.team);
  }
}
