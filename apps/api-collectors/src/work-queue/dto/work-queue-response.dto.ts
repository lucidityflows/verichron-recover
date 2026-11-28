import { ApiProperty } from '@nestjs/swagger';
import {
  IWorkQueueResponse,
  IWorkQueueItem,
  IWorkQueueSummary,
} from '@verichron/contracts';
import { WorkQueueItemStatus, WorkQueuePriority, ActionType } from '@verichron/enums';

/**
 * Individual work queue item DTO for API responses
 */
export class WorkQueueItemDto implements IWorkQueueItem {
  @ApiProperty({
    description: 'Unique work queue item identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  itemId: string;

  @ApiProperty({
    description: 'Debtor profile ID',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  debtorId: string;

  @ApiProperty({
    description: 'Full name of the debtor',
    example: 'John Smith',
  })
  debtorName: string;

  @ApiProperty({
    description: 'Total outstanding balance',
    example: 15750.50,
    type: 'number',
    format: 'decimal',
  })
  totalBalance: number;

  @ApiProperty({
    description: 'Days since oldest debt became overdue',
    example: 45,
    type: 'integer',
  })
  daysOverdue: number;

  @ApiProperty({
    description: 'Calculated priority score (higher = more urgent)',
    example: 87.5,
    type: 'number',
    format: 'decimal',
  })
  priorityScore: number;

  @ApiProperty({
    description: 'Human-readable priority label',
    enum: WorkQueuePriority,
    enumName: 'WorkQueuePriority',
    example: WorkQueuePriority.HIGH,
  })
  priorityLabel: WorkQueuePriority;

  @ApiProperty({
    description: 'Next recommended action type',
    enum: ActionType,
    enumName: 'ActionType',
    example: ActionType.CALL,
    nullable: true,
  })
  nextActionType: ActionType | null;

  @ApiProperty({
    description: 'Due date for next action',
    example: '2024-12-15T10:00:00Z',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  nextActionDue: Date | null;

  @ApiProperty({
    description: 'Date of last contact with debtor',
    example: '2024-12-01T14:30:00Z',
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  lastContactDate: Date | null;

  @ApiProperty({
    description: 'Type of last contact',
    enum: ActionType,
    enumName: 'ActionType',
    example: ActionType.EMAIL,
    nullable: true,
  })
  lastContactType: ActionType | null;

  @ApiProperty({
    description: 'Current status of work item',
    enum: WorkQueueItemStatus,
    enumName: 'WorkQueueItemStatus',
    example: WorkQueueItemStatus.NEW,
  })
  status: WorkQueueItemStatus;

  @ApiProperty({
    description: 'Whether debtor has open dispute',
    example: false,
  })
  hasOpenDispute: boolean;

  @ApiProperty({
    description: 'Whether debtor has active payment plan',
    example: true,
  })
  hasPaymentPlan: boolean;

  @ApiProperty({
    description: 'Tags associated with this work item',
    example: ['high-value', 'responsive'],
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    description: 'Assigned user ID',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
    nullable: true,
  })
  assignedToUserId: string | null;

  @ApiProperty({
    description: 'Assigned user full name',
    example: 'Jane Collector',
    nullable: true,
  })
  assignedToName: string | null;
}

/**
 * Work queue summary statistics DTO
 */
export class WorkQueueSummaryDto implements IWorkQueueSummary {
  @ApiProperty({
    description: 'Total number of items in queue',
    example: 156,
    type: 'integer',
  })
  totalItems: number;

  @ApiProperty({
    description: 'Total balance across all items in queue',
    example: 1245678.90,
    type: 'number',
    format: 'decimal',
  })
  totalBalanceInQueue: number;

  @ApiProperty({
    description: 'Average days overdue across all items',
    example: 42.5,
    type: 'number',
    format: 'decimal',
  })
  avgDaysOverdue: number;

  @ApiProperty({
    description: 'Count of items with NEW status',
    example: 45,
    type: 'integer',
  })
  newItemsCount: number;

  @ApiProperty({
    description: 'Count of items with IN_PROGRESS status',
    example: 32,
    type: 'integer',
  })
  inProgressItemsCount: number;

  @ApiProperty({
    description: 'Count of items with FOLLOW_UP_SCHEDULED status',
    example: 28,
    type: 'integer',
  })
  followUpItemsCount: number;

  @ApiProperty({
    description: 'Count of items with URGENT priority',
    example: 12,
    type: 'integer',
  })
  urgentItemsCount: number;

  @ApiProperty({
    description: 'Count of items with HIGH priority',
    example: 38,
    type: 'integer',
  })
  highPriorityItemsCount: number;

  @ApiProperty({
    description: 'Count of items completed today by this collector',
    example: 7,
    type: 'integer',
  })
  completedTodayCount: number;
}

/**
 * Pagination metadata DTO
 */
export class PaginationDto {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
    type: 'integer',
  })
  currentPage: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    type: 'integer',
  })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
    type: 'integer',
  })
  totalPages: number;

  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 156,
    type: 'integer',
  })
  totalItems: number;
}

/**
 * Complete work queue response DTO
 */
export class WorkQueueResponseDto implements IWorkQueueResponse {
  @ApiProperty({
    description: 'Array of work queue items for current page',
    type: [WorkQueueItemDto],
  })
  items: WorkQueueItemDto[];

  @ApiProperty({
    description: 'Summary statistics for the work queue',
    type: WorkQueueSummaryDto,
  })
  summary: WorkQueueSummaryDto;

  @ApiProperty({
    description: 'Pagination information',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
