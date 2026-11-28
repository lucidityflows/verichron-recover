import { Controller, Get, Query, Param, Post, Body, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { WorkQueueService } from './work-queue.service';
import { WorkQueueQueryDto } from './dto/work-queue-query.dto';
import { WorkQueueResponseDto } from './dto/work-queue-response.dto';
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
} from './dto/bulk-operations.dto';
import {
  CompleteWorkQueueItemDto,
  DeferWorkQueueItemDto,
  UpdateStatusDto,
  StatusTransitionResponseDto,
} from './dto/status-transition.dto';
import { JwtAuthGuard } from '@verichron/auth';
import { TeamAccessGuard } from '../core/guards';

@ApiTags('Work Queue')
@ApiBearerAuth()
@Controller('collectors/work-queues/orgs/:organizationId')
@UseGuards(JwtAuthGuard, TeamAccessGuard)
export class WorkQueueController {
  constructor(private readonly workQueueService: WorkQueueService) {}

  @Get()
  @ApiOperation({
    summary: 'Get work queue items',
    description: `
      Retrieves work queue items with filtering, sorting, and pagination.

      Team Filtering:
      - Without teamId: Shows org-wide queue (or collector's assigned items)
      - With teamId: Shows only items assigned to team members (validated by TeamAccessGuard)

      Behavior:
      - Collectors see only items assigned to them or unassigned items
      - Managers can filter by assignedToUserId to view specific collector queues
      - Returns summary statistics for the filtered queue
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiQuery({
    name: 'teamId',
    description: 'Optional team UUID to filter work queue by team members',
    required: false,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Work queue items retrieved successfully',
    type: WorkQueueResponseDto,
  })
  async getWorkQueue(
    @Param('organizationId') orgId: string,
    @Query() query: WorkQueueQueryDto,
    @Query('teamId') teamId?: string,
  ): Promise<WorkQueueResponseDto> {
    return this.workQueueService.getWorkQueue(orgId, query, teamId);
  }

  @Post(':itemId/assign')
  @ApiOperation({
    summary: 'Manually assign work queue item to collector',
    description: `
      Assigns an unassigned work queue item to a specific collector.

      Behavior:
      - Validates that the item is not already assigned
      - Updates the work queue item status to IN_PROGRESS
      - Creates a CollectorResponseTracking record with MANUAL assignment reason
      - Caches assignment data in the work queue item for fast queries

      Permissions:
      - Managers and admins can assign any unassigned item
      - Returns error if item is already assigned (use reassign instead)
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiParam({ name: 'itemId', type: 'string', format: 'uuid', description: 'The work queue item ID' })
  @ApiResponse({
    status: 200,
    description: 'Work queue item assigned successfully',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Item is already assigned or validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Work queue item not found',
  })
  async assignItem(
    @Param('organizationId') orgId: string,
    @Param('itemId') itemId: string,
    @Body() dto: AssignWorkQueueItemDto,
  ): Promise<AssignmentResponseDto> {
    return this.workQueueService.assignWorkQueueItem(itemId, dto, orgId);
  }

  @Post(':itemId/reassign')
  @ApiOperation({
    summary: 'Reassign work queue item to different collector',
    description: `
      Reassigns an already-assigned work queue item to a different collector.

      Behavior:
      - Validates that the item is currently assigned
      - Validates not reassigning to the same collector
      - Creates a NEW CollectorResponseTracking record (preserves history)
      - Resets contact/response timestamps in the work queue item
      - Updates cached assignment data

      Use Cases:
      - Workload balancing between collectors
      - Transferring accounts when collector goes offline/on leave
      - Reassigning based on collector expertise

      Permissions:
      - Managers and admins only
      - Returns error if item is not currently assigned
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiParam({ name: 'itemId', type: 'string', format: 'uuid', description: 'The work queue item ID' })
  @ApiResponse({
    status: 200,
    description: 'Work queue item reassigned successfully',
    type: AssignmentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Item is not assigned, reassigning to same collector, or validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Work queue item not found',
  })
  async reassignItem(
    @Param('organizationId') orgId: string,
    @Param('itemId') itemId: string,
    @Body() dto: ReassignWorkQueueItemDto,
  ): Promise<AssignmentResponseDto> {
    return this.workQueueService.reassignWorkQueueItem(itemId, dto, orgId);
  }

  // ==================== BULK OPERATIONS ====================

  @Post('bulk/assign')
  @ApiOperation({
    summary: 'Bulk assign multiple work queue items to a collector',
    description: `
      Assigns multiple work queue items to a single collector in one operation.

      Behavior:
      - Processes each item individually with error handling
      - Continues processing even if some items fail
      - Returns detailed results for each item
      - Maximum of 100 items per request

      Use Cases:
      - Balancing workload across team members
      - Reassigning accounts from collector going on leave
      - Initial assignment of imported accounts

      Permissions:
      - Managers and admins only
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Bulk assignment completed (check individual results for success/failure)',
    type: BulkOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (e.g., too many items, invalid UUIDs)',
  })
  async bulkAssign(
    @Param('organizationId') orgId: string,
    @Body() dto: BulkAssignDto,
  ): Promise<BulkOperationResponseDto> {
    return this.workQueueService.bulkAssign(dto, orgId);
  }

  @Post('bulk/defer')
  @ApiOperation({
    summary: 'Bulk defer multiple work queue items to a future date',
    description: `
      Defers multiple work queue items to a specified future date.

      Behavior:
      - Updates status to DEFERRED for each item
      - Sets deferredUntil date for automated reactivation
      - Processes each item individually with error handling
      - Returns detailed results for each item
      - Maximum of 100 items per request

      Use Cases:
      - Deferring accounts awaiting documentation
      - Postponing collection during hardship periods
      - Scheduling follow-up after payment plan setup

      Permissions:
      - Managers and collectors can defer assigned items
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Bulk defer completed (check individual results for success/failure)',
    type: BulkOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (e.g., invalid date, too many items)',
  })
  async bulkDefer(
    @Param('organizationId') orgId: string,
    @Body() dto: BulkDeferDto,
  ): Promise<BulkOperationResponseDto> {
    return this.workQueueService.bulkDefer(dto, orgId);
  }

  @Post('bulk/priority')
  @ApiOperation({
    summary: 'Bulk update priority for multiple work queue items',
    description: `
      Updates the priority level for multiple work queue items.

      Behavior:
      - Sets the same priority for all specified items
      - Processes each item individually with error handling
      - Returns detailed results for each item
      - Maximum of 100 items per request

      Use Cases:
      - Escalating high-value accounts
      - Prioritizing accounts approaching statute of limitations
      - Adjusting priority based on payment behavior
      - Responding to VIP customer requests

      Permissions:
      - Managers and admins only
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Bulk priority update completed (check individual results for success/failure)',
    type: BulkOperationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (e.g., invalid priority, too many items)',
  })
  async bulkUpdatePriority(
    @Param('organizationId') orgId: string,
    @Body() dto: BulkUpdatePriorityDto,
  ): Promise<BulkOperationResponseDto> {
    return this.workQueueService.bulkUpdatePriority(dto, orgId);
  }

  // ==================== STATUS TRANSITIONS ====================

  @Patch(':itemId/complete')
  @ApiOperation({
    summary: 'Complete a work queue item with resolution type',
    description: `
      Marks a work queue item as COMPLETED with a specified resolution type.

      Behavior:
      - Validates item is assigned (cannot complete unassigned items)
      - Validates item is not already completed
      - Updates status to COMPLETED
      - Records resolution in CollectorResponseTracking
      - Calculates days to resolution

      Resolution Types:
      - PAID_IN_FULL: Debt fully paid (also set automatically via payment events)
      - PAYMENT_PLAN: Debtor agreed to payment plan
      - SETTLED: Settled for less than full amount
      - DISPUTED: Debtor disputed the debt
      - TRANSFERRED: Account transferred to another agency
      - WRITTEN_OFF: Debt written off as uncollectible
      - ON_HOLD: Account placed on permanent hold
      - INVALID_DEBT: Debt determined to be invalid
      - STATUTE_EXPIRED: Statute of limitations expired
      - CEASE_AND_DESIST: Debtor requested cease and desist

      Permissions:
      - Collectors can complete their own assigned items
      - Managers can complete any item
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiParam({ name: 'itemId', type: 'string', format: 'uuid', description: 'The work queue item ID' })
  @ApiResponse({
    status: 200,
    description: 'Work queue item completed successfully',
    type: StatusTransitionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Item is unassigned, already completed, or validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Work queue item not found',
  })
  async completeItem(
    @Param('organizationId') orgId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CompleteWorkQueueItemDto,
  ): Promise<StatusTransitionResponseDto> {
    return this.workQueueService.completeWorkQueueItem(itemId, dto, orgId);
  }

  @Patch(':itemId/defer')
  @ApiOperation({
    summary: 'Defer a work queue item to a future date',
    description: `
      Defers a work queue item until a specified future date.

      Behavior:
      - Updates status to DEFERRED
      - Sets deferredUntil timestamp
      - Validates defer date is in the future
      - Cannot defer already completed items

      Use Cases:
      - Awaiting documentation from debtor
      - Postponing during hardship period
      - Following up after promised payment date
      - Waiting for dispute resolution

      Permissions:
      - Collectors can defer their own assigned items
      - Managers can defer any item
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiParam({ name: 'itemId', type: 'string', format: 'uuid', description: 'The work queue item ID' })
  @ApiResponse({
    status: 200,
    description: 'Work queue item deferred successfully',
    type: StatusTransitionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Item is completed, defer date invalid, or validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Work queue item not found',
  })
  async deferItem(
    @Param('organizationId') orgId: string,
    @Param('itemId') itemId: string,
    @Body() dto: DeferWorkQueueItemDto,
  ): Promise<StatusTransitionResponseDto> {
    return this.workQueueService.deferWorkQueueItem(itemId, dto, orgId);
  }

  @Patch(':itemId/status')
  @ApiOperation({
    summary: 'Update work queue item status (generic)',
    description: `
      Updates the status of a work queue item with business rule validation.

      Supported Status Transitions:
      - NEW: Reset to new/unworked status
      - IN_PROGRESS: Mark as actively being worked (requires assignment)
      - FOLLOW_UP_SCHEDULED: Schedule follow-up (requires followUpDate)
      - DEFERRED: Defer to future date (requires deferUntil)
      - ON_HOLD: Place on hold pending resolution
      - SKIPPED: Mark as skipped by collector

      Note: Use dedicated endpoints for:
      - COMPLETED status: Use /complete endpoint (requires resolution type)

      Business Rules:
      - Cannot mark unassigned item as IN_PROGRESS
      - FOLLOW_UP_SCHEDULED requires followUpDate parameter
      - DEFERRED requires deferUntil parameter
      - Cannot transition to COMPLETED via this endpoint

      Permissions:
      - Collectors can update status of their assigned items
      - Managers can update status of any item
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiParam({ name: 'itemId', type: 'string', format: 'uuid', description: 'The work queue item ID' })
  @ApiResponse({
    status: 200,
    description: 'Work queue item status updated successfully',
    type: StatusTransitionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition or validation failed',
  })
  @ApiResponse({
    status: 404,
    description: 'Work queue item not found',
  })
  async updateItemStatus(
    @Param('organizationId') orgId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateStatusDto,
  ): Promise<StatusTransitionResponseDto> {
    return this.workQueueService.updateWorkQueueItemStatus(itemId, dto, orgId);
  }
}

