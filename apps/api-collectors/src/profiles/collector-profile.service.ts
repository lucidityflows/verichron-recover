import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not, In } from 'typeorm';
import { handleServiceError } from '@verichron/error-handling';
import { CollectorProfile } from './entities/collector-profile.entity';
import { WorkQueueItem } from '../work-queue/entities/work-queue-item.entity';
import {
  CreateCollectorProfileDto,
  UpdateCollectorProfileDto,
  CollectorProfileResponseDto,
  CollectorProfileQueryDto,
  UpdateCollectorStatusDto,
  CollectorCapacityDto,
  CollectorCapacityResponseDto,
} from './dto/collector-profile.dto';
import { CollectorAvailabilityStatus, WorkQueueItemStatus } from '@verichron/enums';

/**
 * Collector Profile Service
 *
 * Managing collector attributes:
 * - Skills, Territories, Status, Capacity
 * - Profile CRUD operations
 */
@Injectable()
export class CollectorProfileService {
  private readonly logger = new Logger(CollectorProfileService.name);

  constructor(
    @InjectRepository(CollectorProfile)
    private readonly collectorProfileRepository: Repository<CollectorProfile>,
    @InjectRepository(WorkQueueItem)
    private readonly workQueueRepository: Repository<WorkQueueItem>,
  ) {}

  /**
   * Get all collector profiles for an organization with optional filtering
   */
  async getCollectorProfiles(
    organizationId: string,
    query: CollectorProfileQueryDto = {},
  ): Promise<CollectorProfileResponseDto[]> {
    this.logger.log(`Getting collector profiles for organization ${organizationId}`);

    try {
      const queryBuilder = this.collectorProfileRepository
        .createQueryBuilder('profile')
        .where('profile.organization_id = :organizationId', { organizationId });

      if (query.userId) {
        queryBuilder.andWhere('profile.user_id = :userId', { userId: query.userId });
      }

      if (query.skill) {
        queryBuilder.andWhere(':skill = ANY(profile.skills)', { skill: query.skill });
      }

      if (query.state) {
        queryBuilder.andWhere(':state = ANY(profile.territory_states)', {
          state: query.state,
        });
      }

      if (query.zipcode) {
        queryBuilder.andWhere(':zipcode = ANY(profile.territory_zipcodes)', {
          zipcode: query.zipcode,
        });
      }

      const profiles = await queryBuilder.orderBy('profile.created_at', 'DESC').getMany();

      return profiles.map((profile) => this.mapToResponseDto(profile));
    } catch (error) {
      handleServiceError(
        error,
        this.logger,
        `Failed to get collector profiles for org ${organizationId}`,
        [],
      );
    }
  }

  /**
   * Get a specific collector profile by ID
   */
  async getCollectorProfileById(
    profileId: string,
    organizationId: string,
  ): Promise<CollectorProfileResponseDto> {
    this.logger.log(`Getting collector profile ${profileId}`);

    const profile = await this.collectorProfileRepository.findOne({
      where: {
        id: profileId,
        organizationId,
      },
    });

    if (!profile) {
      throw new NotFoundException(`Collector profile ${profileId} not found`);
    }

    return this.mapToResponseDto(profile);
  }

  /**
   * Create a new collector profile
   */
  async createCollectorProfile(
    dto: CreateCollectorProfileDto,
    organizationId: string,
  ): Promise<CollectorProfileResponseDto> {
    this.logger.log(`Creating collector profile for user ${dto.userId}`);

    const existingProfile = await this.collectorProfileRepository.findOne({
      where: {
        userId: dto.userId,
        organizationId,
      },
    });

    if (existingProfile) {
      throw new ConflictException(
        `Collector profile already exists for user ${dto.userId} in this organization`,
      );
    }

    const profile = this.collectorProfileRepository.create({
      organizationId,
      userId: dto.userId,
      skills: dto.skills || [],
      territoryStates: dto.territoryStates || [],
      territoryZipcodes: dto.territoryZipcodes || [],
      availabilityStatus: dto.availabilityStatus,
      maxDailyAssignments: dto.maxDailyAssignments || null,
      maxConcurrentAccounts: dto.maxConcurrentAccounts || null,
      isAcceptingNewAssignments: dto.isAcceptingNewAssignments ?? true,
      availabilitySchedule: dto.availabilitySchedule || null,
      metadata: dto.metadata || null,
    });

    const savedProfile = await this.collectorProfileRepository.save(profile);

    return this.mapToResponseDto(savedProfile);
  }

  /**
   * Update an existing collector profile
   */
  async updateCollectorProfile(
    profileId: string,
    dto: UpdateCollectorProfileDto,
    organizationId: string,
  ): Promise<CollectorProfileResponseDto> {
    this.logger.log(`Updating collector profile ${profileId}`);

    const profile = await this.collectorProfileRepository.findOne({
      where: {
        id: profileId,
        organizationId,
      },
    });

    if (!profile) {
      throw new NotFoundException(`Collector profile ${profileId} not found`);
    }

    if (dto.skills !== undefined) profile.skills = dto.skills;
    if (dto.territoryStates !== undefined) profile.territoryStates = dto.territoryStates;
    if (dto.territoryZipcodes !== undefined) profile.territoryZipcodes = dto.territoryZipcodes;
    if (dto.availabilityStatus !== undefined) profile.availabilityStatus = dto.availabilityStatus;
    if (dto.maxDailyAssignments !== undefined) profile.maxDailyAssignments = dto.maxDailyAssignments || null;
    if (dto.maxConcurrentAccounts !== undefined) profile.maxConcurrentAccounts = dto.maxConcurrentAccounts || null;
    if (dto.isAcceptingNewAssignments !== undefined) profile.isAcceptingNewAssignments = dto.isAcceptingNewAssignments;
    if (dto.availabilitySchedule !== undefined) profile.availabilitySchedule = dto.availabilitySchedule || null;
    if (dto.metadata !== undefined) profile.metadata = dto.metadata;

    const updatedProfile = await this.collectorProfileRepository.save(profile);
    return this.mapToResponseDto(updatedProfile);
  }

  /**
   * Delete a collector profile
   */
  async deleteCollectorProfile(profileId: string, organizationId: string): Promise<void> {
    const profile = await this.collectorProfileRepository.findOne({
      where: {
        id: profileId,
        organizationId,
      },
    });

    if (!profile) {
      throw new NotFoundException(`Collector profile ${profileId} not found`);
    }

    await this.collectorProfileRepository.remove(profile);
  }

  /**
   * Update collector availability status
   */
  async updateCollectorStatus(
    profileId: string,
    dto: UpdateCollectorStatusDto,
    organizationId: string,
  ): Promise<CollectorProfileResponseDto> {
    const profile = await this.collectorProfileRepository.findOne({
      where: {
        id: profileId,
        organizationId,
      },
    });

    if (!profile) {
      throw new NotFoundException(`Collector profile ${profileId} not found`);
    }

    profile.availabilityStatus = dto.status;
    const updatedProfile = await this.collectorProfileRepository.save(profile);
    return this.mapToResponseDto(updatedProfile);
  }

  /**
   * Get collector capacity information
   */
  async getCollectorCapacity(organizationId: string): Promise<CollectorCapacityResponseDto> {
    const profiles = await this.collectorProfileRepository.find({
      where: { organizationId },
    });

    const capacityData: CollectorCapacityDto[] = await Promise.all(
      profiles.map(async (profile) => {
        const currentWorkload = await this.workQueueRepository.count({
          where: {
            organizationId,
            assignedToUserId: profile.userId,
            status: Not(WorkQueueItemStatus.COMPLETED),
          },
        });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const assignmentsToday = await this.workQueueRepository.count({
          where: {
            organizationId,
            assignedToUserId: profile.userId,
            currentAssignmentStartedAt: MoreThanOrEqual(startOfDay),
          },
        });

        const maxCapacity = profile.maxConcurrentAccounts || 100;
        const workloadPercentage = (currentWorkload / maxCapacity) * 100;

        const isAtCapacity =
          currentWorkload >= maxCapacity ||
          (profile.maxDailyAssignments !== null && assignmentsToday >= profile.maxDailyAssignments) ||
          !profile.isAcceptingNewAssignments;

        return {
          userId: profile.userId,
          collectorName: `Collector ${profile.userId.substring(0, 8)}`,
          availabilityStatus: profile.availabilityStatus,
          currentWorkload,
          maxConcurrentAccounts: profile.maxConcurrentAccounts || undefined,
          maxDailyAssignments: profile.maxDailyAssignments || undefined,
          assignmentsToday,
          isAcceptingNewAssignments: profile.isAcceptingNewAssignments,
          workloadPercentage: parseFloat(workloadPercentage.toFixed(1)),
          isAtCapacity,
        };
      }),
    );

    return {
      collectors: capacityData,
      totalCollectors: capacityData.length,
      availableCollectors: capacityData.filter(
        (c) => c.availabilityStatus === CollectorAvailabilityStatus.AVAILABLE && !c.isAtCapacity,
      ).length,
      collectorsAtCapacity: capacityData.filter((c) => c.isAtCapacity).length,
    };
  }

  // ==================== INTERNAL METHODS (for orchestrator) ====================

  /**
   * Get collector profiles by user IDs (internal endpoint for orchestrator)
   */
  async getCollectorProfilesByUserIds(
    organizationId: string,
    collectorIds: string[],
  ): Promise<CollectorProfileResponseDto[]> {
    try {
      const profiles = await this.collectorProfileRepository.find({
        where: {
          organizationId,
          userId: In(collectorIds),
        },
      });

      return profiles.map((profile) => this.mapToResponseDto(profile));
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to get collector profiles by user IDs', []);
    }
  }

  /**
   * Get collector workload counts (internal endpoint for orchestrator)
   */
  async getCollectorWorkload(
    organizationId: string,
    collectorIds: string[],
  ): Promise<Record<string, number>> {
    try {
      const workload: Record<string, number> = {};

      for (const collectorId of collectorIds) {
        const count = await this.workQueueRepository.count({
          where: {
            organizationId,
            assignedToUserId: collectorId,
            status: In(['NEW', 'IN_PROGRESS', 'FOLLOW_UP_SCHEDULED']),
          },
        });
        workload[collectorId] = count;
      }

      return workload;
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to get collector workload', []);
    }
  }

  /**
   * Get collector skills (internal endpoint for orchestrator)
   */
  async getCollectorSkills(
    organizationId: string,
    collectorIds: string[],
  ): Promise<Record<string, string[]>> {
    try {
      const skills: Record<string, string[]> = {};

      const profiles = await this.collectorProfileRepository.find({
        where: {
          organizationId,
          userId: In(collectorIds),
        },
        select: ['userId', 'skills'],
      });

      for (const profile of profiles) {
        skills[profile.userId] = profile.skills || [];
      }

      for (const collectorId of collectorIds) {
        if (!skills[collectorId]) {
          skills[collectorId] = [];
        }
      }

      return skills;
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to get collector skills', []);
    }
  }

  /**
   * Get collector territories (internal endpoint for orchestrator)
   */
  async getCollectorTerritories(
    organizationId: string,
    collectorIds: string[],
  ): Promise<Record<string, { states?: string[]; zipcodes?: string[] }>> {
    try {
      const territories: Record<string, { states?: string[]; zipcodes?: string[] }> = {};

      const profiles = await this.collectorProfileRepository.find({
        where: {
          organizationId,
          userId: In(collectorIds),
        },
        select: ['userId', 'territoryStates', 'territoryZipcodes'],
      });

      for (const profile of profiles) {
        territories[profile.userId] = {
          states: profile.territoryStates || [],
          zipcodes: profile.territoryZipcodes || [],
        };
      }

      for (const collectorId of collectorIds) {
        if (!territories[collectorId]) {
          territories[collectorId] = {
            states: [],
            zipcodes: [],
          };
        }
      }

      return territories;
    } catch (error) {
      handleServiceError(error, this.logger, 'Failed to get collector territories', []);
    }
  }

  /**
   * Helper method to map entity to response DTO
   */
  private mapToResponseDto(profile: CollectorProfile): CollectorProfileResponseDto {
    return {
      id: profile.id,
      organizationId: profile.organizationId,
      userId: profile.userId,
      skills: profile.skills,
      territoryStates: profile.territoryStates,
      territoryZipcodes: profile.territoryZipcodes,
      availabilityStatus: profile.availabilityStatus,
      maxDailyAssignments: profile.maxDailyAssignments || undefined,
      maxConcurrentAccounts: profile.maxConcurrentAccounts || undefined,
      isAcceptingNewAssignments: profile.isAcceptingNewAssignments,
      availabilitySchedule: profile.availabilitySchedule || undefined,
      metadata: profile.metadata || undefined,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }
}
