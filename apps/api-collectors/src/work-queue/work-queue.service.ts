import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, MoreThan } from 'typeorm';
import { EventPublisher } from '@verichron/event-publisher';
import { WorkQueueItem } from './entities/work-queue-item.entity';
import { WorkQueueQueryDto } from './dto/work-queue-query.dto';
import {
  WorkQueueResponseDto,
  WorkQueueItemDto,
  WorkQueueSummaryDto,
  PaginationDto,
} from './dto/work-queue-response.dto';
import {
  AssignWorkQueueItemDto,
  ReassignWorkQueueItemDto,
  AssignmentResponseDto,
} from './dto/assign-work-queue-item.dto';
import {
  BulkAssignDto,
  BulkDeferDto,
  BulkUpdatePriorityDto,
  BulkOperationResponseDto,
  BulkOperationItemResult,
} from './dto/bulk-operations.dto';
import {
  CompleteWorkQueueItemDto,
  DeferWorkQueueItemDto,
  UpdateStatusDto,
  StatusTransitionResponseDto,
} from './dto/status-transition.dto';
import { WorkQueueSortBy, SortOrder, WorkQueueItemStatus, AssignmentReason } from '@verichron/enums';
import { RequestContext } from '../core/services/request-context.service';
import { TeamsClientService } from '../core/services/teams-client.service';
import { CollectorResponseTrackingService } from '../performance/collector-response-tracking.service';
import { AssignmentRegistryService } from '../assignments/assignment-registry.service';

/**
 * Service responsible for work queue business logic.
 *
 * Core Responsibilities:
 * - Query work queue items with filtering, sorting, and pagination
 * - Calculate summary statistics for collector dashboard
 * - Scope all operations by organizationId for tenant isolation
 * - Support collector-specific queues via assignedToUserId filtering
 * - Synchronize active assignments with the Redis Registry
 *
 * Architecture:
 * - This is a read-optimized service for a denormalized read model
 * - Work queue items are updated via event handlers (not this service)
 * - Prioritization is calculated by a separate prioritization service
 */
@Injectable()
export class WorkQueueService {
  private readonly logger = new Logger(WorkQueueService.name);

  constructor(
    @InjectRepository(WorkQueueItem)
    private readonly workQueueRepository: Repository<WorkQueueItem>,
    private readonly requestContext: RequestContext,
    private readonly eventPublisher: EventPublisher,
    private readonly responseTrackingService: CollectorResponseTrackingService,
    private readonly teamsClient: TeamsClientService,
    private readonly registryService: AssignmentRegistryService,
  ) {}

  /**
   * Get work queue items with filtering, sorting, and pagination.
   *
   * Process:
   * 1. Extract organizationId and userId from RequestContext
   * 2. Optionally fetch team members if teamId provided
   * 3. Build query with filters (priority, status, search, etc.)
   * 4. Apply team filtering if teamId provided
   * 5. Apply sorting (default: priority_score DESC)
   * 6. Paginate results
   * 7. Calculate summary statistics
   * 8. Return paginated response with summary
   *
   * Team Filtering:
   * - Without teamId: Shows org-wide queue (or collector's assigned items)
   * - With teamId: Shows only items assigned to team members
   *
   * @param orgId - The organization ID
   * @param query - Query parameters for filtering and pagination
   * @param teamId - Optional team ID to filter by team members
   * @returns Paginated work queue items with summary statistics
   */
  async getWorkQueue(
    orgId: string,
    query: WorkQueueQueryDto,
    teamId?: string,
  ): Promise<WorkQueueResponseDto> {
    const userId = this.requestContext.getUserId();
    const userRoles = this.requestContext.getRoles();

    // Fetch team members if teamId provided
    let teamMemberIds: string[] | undefined;
    if (teamId) {
      try {
        const teamMembers = await this.teamsClient.getTeamMembers(orgId, teamId);
        teamMemberIds = teamMembers.map((member: any) => member.userId);
        this.logger.log(
          `Filtering work queue to ${teamMemberIds.length} team members for team ${teamId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to fetch team members for team ${teamId}`,
          error instanceof Error ? error.stack : undefined,
        );
        // Gracefully fall back to org-wide filtering
        teamMemberIds = undefined;
      }
    }

    this.logger.log(`Fetching work queue for organization ${orgId}`, {
      userId,
      roles: userRoles,
      filters: query,
      teamId: teamId || 'org-wide',
      teamMemberCount: teamMemberIds?.length,
    });

    // Build base query
    const queryBuilder = this.workQueueRepository
      .createQueryBuilder('wq')
      .where('wq.organization_id = :orgId', { orgId }); // Use orgId from parameter

    // Apply filters
    this.applyFilters(queryBuilder, query, userId, userRoles, teamMemberIds);

    // Apply sorting
    const sortBy = query.sortBy || WorkQueueSortBy.PRIORITY_SCORE;
    const sortOrder = query.sortOrder || SortOrder.DESC;
    this.applySorting(queryBuilder, sortBy, sortOrder);

    // Get total count for pagination
    const totalItems = await queryBuilder.getCount();

    // Apply pagination
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    queryBuilder.skip(skip).take(pageSize);

    // Execute query
    const items = await queryBuilder.getMany();

    // Calculate summary statistics
    const summary = await this.calculateSummary(orgId, userId, userRoles, teamMemberIds); // Pass teamMemberIds for team filtering

    // Map to DTOs
    const itemDtos: WorkQueueItemDto[] = items.map((item) => this.mapToDto(item));

    const pagination: PaginationDto = {
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
      totalItems,
    };

    return {
      items: itemDtos,
      summary,
      pagination,
    };
  }

  /**
   * Apply filters to query builder based on query parameters.
   *
   * Team Filtering:
   * - If teamMemberIds provided, filters to only show items assigned to team members
   * - Allows managers to view team-specific queues
   * - Preserves existing collector/manager filtering logic
   */
  private applyFilters(
    queryBuilder: SelectQueryBuilder<WorkQueueItem>,
    query: WorkQueueQueryDto,
    userId: string | undefined,
    userRoles: string[],
    teamMemberIds?: string[],
  ): void {
    // Filter by team members if teamId was provided
    if (teamMemberIds && teamMemberIds.length > 0) {
      queryBuilder.andWhere('wq.assigned_to_user_id = ANY(:teamMemberIds)', {
        teamMemberIds,
      });
      // When filtering by team, don't apply user-specific filters
      // (managers viewing team queue should see all team items)
    } else {
      // Original user-based filtering (org-wide or user-specific)
      // Filter by assigned user (for collectors) or allow managers to specify
      if (query.assignedToUserId) {
        // Manager viewing specific collector's queue
        queryBuilder.andWhere('wq.assigned_to_user_id = :assignedToUserId', {
          assignedToUserId: query.assignedToUserId,
        });
      } else if (userId && !this.isManager(userRoles)) {
        // Collector viewing their own queue
        queryBuilder.andWhere(
          '(wq.assigned_to_user_id = :userId OR wq.assigned_to_user_id IS NULL)',
          { userId },
        );
      }
    }

    // Filter by priority
    if (query.priority) {
      queryBuilder.andWhere('wq.priority_label = :priority', {
        priority: query.priority,
      });
    }

    // Filter by status
    if (query.status) {
      queryBuilder.andWhere('wq.status = :status', { status: query.status });
    }

    // Search by debtor name
    if (query.searchQuery) {
      queryBuilder.andWhere('wq.debtor_name ILIKE :searchQuery', {
        searchQuery: `%${query.searchQuery}%`,
      });
    }

    // Filter by balance range
    if (query.minBalance !== undefined) {
      queryBuilder.andWhere('wq.total_balance >= :minBalance', {
        minBalance: query.minBalance,
      });
    }
    if (query.maxBalance !== undefined) {
      queryBuilder.andWhere('wq.total_balance <= :maxBalance', {
        maxBalance: query.maxBalance,
      });
    }

    // Filter by days overdue
    if (query.minDaysOverdue !== undefined) {
      queryBuilder.andWhere('wq.days_overdue >= :minDaysOverdue', {
        minDaysOverdue: query.minDaysOverdue,
      });
    }

    // Filter by tags (OR logic - items with ANY of these tags)
    if (query.tags && query.tags.length > 0) {
      queryBuilder.andWhere('wq.tags && :tags', { tags: query.tags });
    }
  }

  /**
   * Apply sorting to query builder.
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<WorkQueueItem>,
    sortBy: WorkQueueSortBy,
    sortOrder: SortOrder,
  ): void {
    const orderDirection = sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';

    switch (sortBy) {
      case WorkQueueSortBy.PRIORITY_SCORE:
        queryBuilder.orderBy('wq.priority_score', orderDirection);
        break;
      case WorkQueueSortBy.TOTAL_BALANCE:
        queryBuilder.orderBy('wq.total_balance', orderDirection);
        break;
      case WorkQueueSortBy.DAYS_OVERDUE:
        queryBuilder.orderBy('wq.days_overdue', orderDirection);
        break;
      case WorkQueueSortBy.LAST_CONTACT_DATE:
        queryBuilder.orderBy('wq.last_contact_date', orderDirection);
        break;
      case WorkQueueSortBy.NEXT_ACTION_DUE:
        queryBuilder.orderBy('wq.next_action_due', orderDirection);
        break;
      default:
        queryBuilder.orderBy('wq.priority_score', 'DESC');
    }

    // Secondary sort by created_at for consistency
    queryBuilder.addOrderBy('wq.created_at', 'DESC');
  }

  /**
   * Calculate summary statistics for the work queue.
   *
   * Team Filtering:
   * - If teamMemberIds provided, calculates summary only for team members' items
   * - Otherwise uses org-wide or user-specific filtering
   */
  private async calculateSummary(
    organizationId: string,
    userId: string | undefined,
    userRoles: string[],
    teamMemberIds?: string[],
  ): Promise<WorkQueueSummaryDto> {
    // Build query for summary (same filtering as main query)
    const queryBuilder = this.workQueueRepository
      .createQueryBuilder('wq')
      .where('wq.organization_id = :organizationId', { organizationId });

    // Apply team filtering or user filtering
    if (teamMemberIds && teamMemberIds.length > 0) {
      // Filter by team members
      queryBuilder.andWhere('wq.assigned_to_user_id = ANY(:teamMemberIds)', {
        teamMemberIds,
      });
    } else if (userId && !this.isManager(userRoles)) {
      // Apply same user filtering as main query
      queryBuilder.andWhere(
        '(wq.assigned_to_user_id = :userId OR wq.assigned_to_user_id IS NULL)',
        { userId },
      );
    }

    // Get aggregate statistics
    const result = await queryBuilder
      .select('COUNT(*)', 'totalItems')
      .addSelect('COALESCE(SUM(wq.total_balance), 0)', 'totalBalanceInQueue')
      .addSelect('COALESCE(AVG(wq.days_overdue), 0)', 'avgDaysOverdue')
      .addSelect(
        `SUM(CASE WHEN wq.status = '${WorkQueueItemStatus.NEW}' THEN 1 ELSE 0 END)`,
        'newItemsCount',
      )
      .addSelect(
        `SUM(CASE WHEN wq.status = '${WorkQueueItemStatus.IN_PROGRESS}' THEN 1 ELSE 0 END)`,
        'inProgressItemsCount',
      )
      .addSelect(
        `SUM(CASE WHEN wq.status = '${WorkQueueItemStatus.FOLLOW_UP_SCHEDULED}' THEN 1 ELSE 0 END)`,
        'followUpItemsCount',
      )
      .addSelect(
        `SUM(CASE WHEN wq.priority_label = 'URGENT' THEN 1 ELSE 0 END)`,
        'urgentItemsCount',
      )
      .addSelect(
        `SUM(CASE WHEN wq.priority_label = 'HIGH' THEN 1 ELSE 0 END)`,
        'highPriorityItemsCount',
      )
      .getRawOne();

    // Get completed today count (for this specific collector)
    let completedTodayCount = 0;
    if (userId) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      completedTodayCount = await this.workQueueRepository.count({
        where: {
          organizationId,
          assignedToUserId: userId,
          status: WorkQueueItemStatus.COMPLETED,
          updatedAt: MoreThan(startOfDay), // Use MoreThan operator
        },
      });
    }

    return {
      totalItems: parseInt(result.totalItems) || 0,
      totalBalanceInQueue: parseFloat(result.totalBalanceInQueue) || 0,
      avgDaysOverdue: parseFloat(result.avgDaysOverdue) || 0,
      newItemsCount: parseInt(result.newItemsCount) || 0,
      inProgressItemsCount: parseInt(result.inProgressItemsCount) || 0,
      followUpItemsCount: parseInt(result.followUpItemsCount) || 0,
      urgentItemsCount: parseInt(result.urgentItemsCount) || 0,
      highPriorityItemsCount: parseInt(result.highPriorityItemsCount) || 0,
      completedTodayCount,
    };
  }

  /**
   * Map WorkQueueItem entity to DTO.
   */
  private mapToDto(item: WorkQueueItem): WorkQueueItemDto {
    return {
      itemId: item.id,
      debtorId: item.debtorId,
      debtorName: item.debtorName,
      totalBalance: item.totalBalance,
      daysOverdue: item.daysOverdue,
      priorityScore: item.priorityScore,
      priorityLabel: item.priorityLabel,
      nextActionType: item.nextActionType,
      nextActionDue: item.nextActionDue,
      lastContactDate: item.lastContactDate,
      lastContactType: item.lastContactType,
      status: item.status,
      hasOpenDispute: item.hasOpenDispute,
      hasPaymentPlan: item.hasPaymentPlan,
      tags: item.tags,
      assignedToUserId: item.assignedToUserId,
      assignedToName: item.assignedToName,
    };
  }

  /**
   * Check if user has manager role.
   */
  private isManager(roles: string[]): boolean {
    return roles.includes('Organization Admin') || roles.includes('ORG_MANAGER');
  }

  /**
   * Get unassigned work queue items for auto-assignment.
   * This is called by the event orchestrator for api-workflows scheduler.
   *
   * @param organizationId - The organization ID
   * @param filters - Optional filters for balanceRange, accountAgeRange, priority, portfolioIds
   * @param limit - Maximum number of items to return
   * @returns Array of unassigned work queue items
   */
  async getUnassignedItems(
    organizationId: string,
    filters?: {
      portfolioIds?: string[];
      balanceRange?: [number, number];
      accountAgeRange?: [number, number];
      priority?: string[];
      [key: string]: any;
    },
    limit = 50,
  ): Promise<any[]> {
    this.logger.log(
      `Fetching unassigned work queue items for organization ${organizationId}`,
      { filters, limit }
    );

    // Build query for unassigned items
    const queryBuilder = this.workQueueRepository
      .createQueryBuilder('wq')
      .where('wq.organization_id = :organizationId', { organizationId })
      .andWhere('wq.assigned_to_user_id IS NULL'); // Only unassigned items

    // Apply filters if provided
    if (filters) {
      // Filter by portfolio IDs
      if (filters.portfolioIds && filters.portfolioIds.length > 0) {
        queryBuilder.andWhere('wq.portfolio_id = ANY(:portfolioIds)', {
          portfolioIds: filters.portfolioIds,
        });
      }

      // Filter by balance range
      if (filters.balanceRange) {
        const [min, max] = filters.balanceRange;
        queryBuilder.andWhere('wq.total_balance >= :minBalance', { minBalance: min });
        queryBuilder.andWhere('wq.total_balance <= :maxBalance', { maxBalance: max });
      }

      // Filter by account age range (days overdue)
      if (filters.accountAgeRange) {
        const [min, max] = filters.accountAgeRange;
        queryBuilder.andWhere('wq.days_overdue >= :minAge', { minAge: min });
        queryBuilder.andWhere('wq.days_overdue <= :maxAge', { maxAge: max });
      }

      // Filter by priority
      if (filters.priority && filters.priority.length > 0) {
        queryBuilder.andWhere('wq.priority_label = ANY(:priorities)', {
          priorities: filters.priority,
        });
      }
    }

    // Order by priority score (highest first)
    queryBuilder.orderBy('wq.priority_score', 'DESC');

    // Limit results
    queryBuilder.limit(limit);

    // Execute query
    const items = await queryBuilder.getMany();

    this.logger.log(
      `Found ${items.length} unassigned work queue items for organization ${organizationId}`
    );

    // Map to a simplified format for auto-assignment
    return items.map((item) => ({
      id: item.id,
      type: 'DEBTOR', // Work queue items represent debtors
      debtorId: item.debtorId,
      debtorName: item.debtorName,
      balance: item.totalBalance,
      location: {
        // Extract location data if available from tags or other fields
        // For now, returning undefined - would need additional fields in entity
        state: undefined,
        city: undefined,
        zipCode: undefined,
      },
      category: undefined, // Would need to add this field or derive from tags
      priority: item.priorityLabel,
      accountAge: item.daysOverdue,
      portfolioId: undefined, // Would need to add this field to work queue entity
    }));
  }

  /**
   * Manually assign a work queue item to a collector
   *
   * Process:
   * 1. Validate work queue item exists and belongs to organization
   * 2. Validate item is not already assigned
   * 3. Update work queue item with assignment
   * 4. Create CollectorResponseTracking record
   * 5. Return success response
   *
   * @param itemId - Work queue item ID
   * @param dto - Assignment details
   * @param organizationId - Organization ID from context
   * @returns Assignment response with details
   */
  async assignWorkQueueItem(
    itemId: string,
    dto: AssignWorkQueueItemDto,
    organizationId: string,
  ): Promise<AssignmentResponseDto> {
    this.logger.log(
      `Manually assigning work queue item ${itemId} to collector ${dto.collectorUserId}`,
    );

    // Find work queue item
    const workQueueItem = await this.workQueueRepository.findOne({
      where: {
        id: itemId,
        organizationId,
      },
    });

    if (!workQueueItem) {
      throw new NotFoundException(
        `Work queue item ${itemId} not found in organization ${organizationId}`,
      );
    }

    // Check if already assigned
    if (workQueueItem.assignedToUserId) {
      throw new BadRequestException(
        `Work queue item ${itemId} is already assigned to collector ${workQueueItem.assignedToUserId}. Use reassign endpoint instead.`,
      );
    }

    const now = new Date();

    // Update work queue item
    workQueueItem.assignedToUserId = dto.collectorUserId;
    workQueueItem.status = WorkQueueItemStatus.IN_PROGRESS;
    workQueueItem.currentAssignmentStartedAt = now;

    await this.workQueueRepository.save(workQueueItem);

    this.logger.log(
      `Updated work queue item ${itemId} with assignment to collector ${dto.collectorUserId}`,
    );

    // Synchronize with Redis Tactical Registry
    await this.registryService.addAssignment(dto.collectorUserId, workQueueItem.debtorId);

    // Create CollectorResponseTracking record
    await this.responseTrackingService.createTrackingRecord({
      organizationId,
      collectorUserId: dto.collectorUserId,
      debtorId: workQueueItem.debtorId,
      workQueueItemId: itemId,
      assignedAt: now,
      assignmentReason: AssignmentReason.MANUAL,
      metadata: dto.reason ? { assignmentReason: dto.reason } : undefined,
    });

    this.logger.log(
      `Created response tracking record for work queue item ${itemId}`,
    );

    return {
      success: true,
      workQueueItemId: itemId,
      assignedToUserId: dto.collectorUserId,
      assignedAt: now.toISOString(),
      message: `Work queue item successfully assigned to collector ${dto.collectorUserId}`,
    };
  }

  /**
   * Reassign a work queue item to a different collector
   *
   * Process:
   * 1. Validate work queue item exists and belongs to organization
   * 2. Validate item is currently assigned
   * 3. Update work queue item with new assignment
   * 4. Create new CollectorResponseTracking record (preserves previous assignment history)
   * 5. Return success response
   *
   * @param itemId - Work queue item ID
   * @param dto - Reassignment details
   * @param organizationId - Organization ID from context
   * @returns Assignment response with details
   */
  async reassignWorkQueueItem(
    itemId: string,
    dto: ReassignWorkQueueItemDto,
    organizationId: string,
  ): Promise<AssignmentResponseDto> {
    this.logger.log(
      `Reassigning work queue item ${itemId} to collector ${dto.newCollectorUserId}`,
    );

    // Find work queue item
    const workQueueItem = await this.workQueueRepository.findOne({
      where: {
        id: itemId,
        organizationId,
      },
    });

    if (!workQueueItem) {
      throw new NotFoundException(
        `Work queue item ${itemId} not found in organization ${organizationId}`,
      );
    }

    // Check if currently assigned
    if (!workQueueItem.assignedToUserId) {
      throw new BadRequestException(
        `Work queue item ${itemId} is not currently assigned. Use assign endpoint instead.`,
      );
    }

    // Check if trying to reassign to same collector
    if (workQueueItem.assignedToUserId === dto.newCollectorUserId) {
      throw new BadRequestException(
        `Work queue item ${itemId} is already assigned to collector ${dto.newCollectorUserId}`,
      );
    }

    const previousCollectorId = workQueueItem.assignedToUserId;
    const now = new Date();

    // Update work queue item
    workQueueItem.assignedToUserId = dto.newCollectorUserId;
    workQueueItem.currentAssignmentStartedAt = now;
    // Reset contact/response timestamps for new assignment
    workQueueItem.firstContactAttemptAt = undefined;
    workQueueItem.firstResponseAt = undefined;

    await this.workQueueRepository.save(workQueueItem);

    this.logger.log(
      `Reassigned work queue item ${itemId} from collector ${previousCollectorId} to ${dto.newCollectorUserId}`,
    );

    // Synchronize with Redis Tactical Registry
    await Promise.all([
      this.registryService.removeAssignment(previousCollectorId, workQueueItem.debtorId),
      this.registryService.addAssignment(dto.newCollectorUserId, workQueueItem.debtorId),
    ]);

    // Create NEW CollectorResponseTracking record (preserves history)
    await this.responseTrackingService.createTrackingRecord({
      organizationId,
      collectorUserId: dto.newCollectorUserId,
      debtorId: workQueueItem.debtorId,
      workQueueItemId: itemId,
      assignedAt: now,
      assignmentReason: AssignmentReason.REASSIGNMENT,
      reassignedFromCollectorId: previousCollectorId,
      metadata: dto.reason ? { reassignmentReason: dto.reason } : undefined,
    });

    this.logger.log(
      `Created new response tracking record for reassigned work queue item ${itemId}`,
    );

    return {
      success: true,
      workQueueItemId: itemId,
      assignedToUserId: dto.newCollectorUserId,
      previousCollectorUserId: previousCollectorId,
      assignedAt: now.toISOString(),
      message: `Work queue item successfully reassigned from collector ${previousCollectorId} to ${dto.newCollectorUserId}`,
    };
  }

  /**
   * Bulk assign multiple work queue items to a single collector
   *
   * @param dto - Bulk assignment data
   * @param organizationId - Organization ID for scoping
   * @returns Summary of bulk operation with individual item results
   */
  async bulkAssign(
    dto: BulkAssignDto,
    organizationId: string,
  ): Promise<BulkOperationResponseDto> {
    this.logger.log(
      `Bulk assigning ${dto.workQueueItemIds.length} work queue items to collector ${dto.collectorUserId}`,
    );

    const results: BulkOperationItemResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each item individually
    for (const itemId of dto.workQueueItemIds) {
      try {
        // Attempt to assign the item
        await this.assignWorkQueueItem(
          itemId,
          {
            collectorUserId: dto.collectorUserId,
            reason: dto.reason,
          },
          organizationId,
        );

        results.push({
          workQueueItemId: itemId,
          success: true,
        });
        successCount++;
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';

        results.push({
          workQueueItemId: itemId,
          success: false,
          error: errorMessage,
        });
        failureCount++;

        this.logger.warn(
          `Failed to assign work queue item ${itemId} in bulk operation: ${errorMessage}`,
        );
      }
    }

    const completedAt = new Date().toISOString();
    const message = `Bulk assignment completed: ${successCount} succeeded, ${failureCount} failed`;

    this.logger.log(message);

    return {
      totalItems: dto.workQueueItemIds.length,
      successCount,
      failureCount,
      results,
      message,
      completedAt,
    };
  }

  /**
   * Bulk defer multiple work queue items to a future date
   *
   * @param dto - Bulk defer data
   * @param organizationId - Organization ID for scoping
   * @returns Summary of bulk operation with individual item results
   */
  async bulkDefer(
    dto: BulkDeferDto,
    organizationId: string,
  ): Promise<BulkOperationResponseDto> {
    this.logger.log(
      `Bulk deferring ${dto.workQueueItemIds.length} work queue items until ${dto.deferUntil}`,
    );

    const results: BulkOperationItemResult[] = [];
    let successCount = 0;
    let failureCount = 0;
    const deferUntilDate = new Date(dto.deferUntil);

    // Process each item individually
    for (const itemId of dto.workQueueItemIds) {
      try {
        // Find the work queue item
        const workQueueItem = await this.workQueueRepository.findOne({
          where: {
            id: itemId,
            organizationId,
          },
        });

        if (!workQueueItem) {
          throw new NotFoundException(`Work queue item ${itemId} not found`);
        }

        // Update status to DEFERRED and set deferUntil date
        workQueueItem.status = WorkQueueItemStatus.DEFERRED;
        workQueueItem.deferredUntil = deferUntilDate;

        await this.workQueueRepository.save(workQueueItem);

        results.push({
          workQueueItemId: itemId,
          success: true,
        });
        successCount++;

        this.logger.log(`Deferred work queue item ${itemId} until ${dto.deferUntil}`);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';

        results.push({
          workQueueItemId: itemId,
          success: false,
          error: errorMessage,
        });
        failureCount++;

        this.logger.warn(
          `Failed to defer work queue item ${itemId} in bulk operation: ${errorMessage}`,
        );
      }
    }

    const completedAt = new Date().toISOString();
    const message = `Bulk defer completed: ${successCount} succeeded, ${failureCount} failed`;

    this.logger.log(message);

    return {
      totalItems: dto.workQueueItemIds.length,
      successCount,
      failureCount,
      results,
      message,
      completedAt,
    };
  }

  /**
   * Bulk update priority for multiple work queue items
   *
   * @param dto - Bulk priority update data
   * @param organizationId - Organization ID for scoping
   * @returns Summary of bulk operation with individual item results
   */
  async bulkUpdatePriority(
    dto: BulkUpdatePriorityDto,
    organizationId: string,
  ): Promise<BulkOperationResponseDto> {
    this.logger.log(
      `Bulk updating priority for ${dto.workQueueItemIds.length} work queue items to ${dto.priority}`,
    );

    const results: BulkOperationItemResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Process each item individually
    for (const itemId of dto.workQueueItemIds) {
      try {
        // Find the work queue item
        const workQueueItem = await this.workQueueRepository.findOne({
          where: {
            id: itemId,
            organizationId,
          },
        });

        if (!workQueueItem) {
          throw new NotFoundException(`Work queue item ${itemId} not found`);
        }

        // Update priority label
        workQueueItem.priorityLabel = dto.priority;

        await this.workQueueRepository.save(workQueueItem);

        results.push({
          workQueueItemId: itemId,
          success: true,
        });
        successCount++;

        this.logger.log(`Updated priority for work queue item ${itemId} to ${dto.priority}`);
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';

        results.push({
          workQueueItemId: itemId,
          success: false,
          error: errorMessage,
        });
        failureCount++;

        this.logger.warn(
          `Failed to update priority for work queue item ${itemId} in bulk operation: ${errorMessage}`,
        );
      }
    }

    const completedAt = new Date().toISOString();
    const message = `Bulk priority update completed: ${successCount} succeeded, ${failureCount} failed`;

    this.logger.log(message);

    return {
      totalItems: dto.workQueueItemIds.length,
      successCount,
      failureCount,
      results,
      message,
      completedAt,
    };
  }

  /**
   * Complete a work queue item with resolution type
   *
   * @param itemId - Work queue item ID
   * @param dto - Completion data
   * @param organizationId - Organization ID for scoping
   * @returns Status transition response
   */
  async completeWorkQueueItem(
    itemId: string,
    dto: CompleteWorkQueueItemDto,
    organizationId: string,
  ): Promise<StatusTransitionResponseDto> {
    this.logger.log(`Completing work queue item ${itemId} with resolution type ${dto.resolutionType}`);

    // Find the work queue item
    const workQueueItem = await this.workQueueRepository.findOne({
      where: {
        id: itemId,
        organizationId,
      },
    });

    if (!workQueueItem) {
      throw new NotFoundException(`Work queue item ${itemId} not found`);
    }

    // Validate business rules
    if (!workQueueItem.assignedToUserId) {
      throw new BadRequestException('Cannot complete unassigned work queue item');
    }

    if (workQueueItem.status === WorkQueueItemStatus.COMPLETED) {
      throw new BadRequestException('Work queue item is already completed');
    }

    const previousStatus = workQueueItem.status;
    const now = new Date();

    // Update status to COMPLETED
    workQueueItem.status = WorkQueueItemStatus.COMPLETED;

    await this.workQueueRepository.save(workQueueItem);

    this.logger.log(`Work queue item ${itemId} marked as COMPLETED`);

    // Synchronize with Redis Tactical Registry
    if (workQueueItem.assignedToUserId) {
      await this.registryService.removeAssignment(workQueueItem.assignedToUserId, workQueueItem.debtorId);
    }

    // Update CollectorResponseTracking with resolution
    await this.responseTrackingService.recordResolution(
      itemId,
      now,
      dto.resolutionType,
    );

    this.logger.log(`Recorded resolution for work queue item ${itemId}`);

    return {
      success: true,
      workQueueItemId: itemId,
      previousStatus,
      newStatus: WorkQueueItemStatus.COMPLETED,
      resolutionType: dto.resolutionType,
      transitionedAt: now.toISOString(),
      message: `Work queue item successfully completed with resolution type: ${dto.resolutionType}`,
    };
  }

  /**
   * Defer a single work queue item to a future date
   *
   * @param itemId - Work queue item ID
   * @param dto - Defer data
   * @param organizationId - Organization ID for scoping
   * @returns Status transition response
   */
  async deferWorkQueueItem(
    itemId: string,
    dto: DeferWorkQueueItemDto,
    organizationId: string,
  ): Promise<StatusTransitionResponseDto> {
    this.logger.log(`Deferring work queue item ${itemId} until ${dto.deferUntil}`);

    // Find the work queue item
    const workQueueItem = await this.workQueueRepository.findOne({
      where: {
        id: itemId,
        organizationId,
      },
    });

    if (!workQueueItem) {
      throw new NotFoundException(`Work queue item ${itemId} not found`);
    }

    // Validate business rules
    if (workQueueItem.status === WorkQueueItemStatus.COMPLETED) {
      throw new BadRequestException('Cannot defer completed work queue item');
    }

    const previousStatus = workQueueItem.status;
    const now = new Date();
    const deferUntilDate = new Date(dto.deferUntil);

    // Validate defer date is in the future
    if (deferUntilDate <= now) {
      throw new BadRequestException('Defer until date must be in the future');
    }

    // Update status to DEFERRED
    workQueueItem.status = WorkQueueItemStatus.DEFERRED;
    workQueueItem.deferredUntil = deferUntilDate;

    await this.workQueueRepository.save(workQueueItem);

    this.logger.log(`Work queue item ${itemId} deferred until ${dto.deferUntil}`);

    return {
      success: true,
      workQueueItemId: itemId,
      previousStatus,
      newStatus: WorkQueueItemStatus.DEFERRED,
      transitionedAt: now.toISOString(),
      message: `Work queue item successfully deferred until ${dto.deferUntil}`,
    };
  }

  /**
   * Update work queue item status with validation
   *
   * @param itemId - Work queue item ID
   * @param dto - Status update data
   * @param organizationId - Organization ID for scoping
   * @returns Status transition response
   */
  async updateWorkQueueItemStatus(
    itemId: string,
    dto: UpdateStatusDto,
    organizationId: string,
  ): Promise<StatusTransitionResponseDto> {
    this.logger.log(`Updating work queue item ${itemId} status to ${dto.status}`);

    // Find the work queue item
    const workQueueItem = await this.workQueueRepository.findOne({
      where: {
        id: itemId,
        organizationId,
      },
    });

    if (!workQueueItem) {
      throw new NotFoundException(`Work queue item ${itemId} not found`);
    }

    const previousStatus = workQueueItem.status;
    const now = new Date();

    // Validate status transitions
    if (dto.status === WorkQueueItemStatus.COMPLETED) {
      throw new BadRequestException(
        'Use the complete endpoint to mark item as COMPLETED (requires resolution type)',
      );
    }

    if (dto.status === WorkQueueItemStatus.IN_PROGRESS && !workQueueItem.assignedToUserId) {
      throw new BadRequestException('Cannot mark unassigned item as IN_PROGRESS');
    }

    if (dto.status === WorkQueueItemStatus.DEFERRED) {
      if (!dto.deferUntil) {
        throw new BadRequestException('deferUntil is required for DEFERRED status');
      }
      const deferUntilDate = new Date(dto.deferUntil);
      if (deferUntilDate <= now) {
        throw new BadRequestException('Defer until date must be in the future');
      }
      workQueueItem.deferredUntil = deferUntilDate;
    }

    if (dto.status === WorkQueueItemStatus.FOLLOW_UP_SCHEDULED && !dto.followUpDate) {
      throw new BadRequestException('followUpDate is required for FOLLOW_UP_SCHEDULED status');
    }

    // Update status
    workQueueItem.status = dto.status;

    await this.workQueueRepository.save(workQueueItem);

    this.logger.log(`Work queue item ${itemId} status updated to ${dto.status}`);

    return {
      success: true,
      workQueueItemId: itemId,
      previousStatus,
      newStatus: dto.status,
      transitionedAt: now.toISOString(),
      message: `Work queue item status successfully updated to ${dto.status}`,
    };
  }
}
