import { WorkQueueItemStatus, WorkQueuePriority, WorkQueueSortBy, ActionType } from '@verichron/enums';
import { SortOrder } from '@verichron/enums';

/**
 * Work queue item representing a debtor requiring collector action
 */
export interface IWorkQueueItem {
  itemId: string;
  debtorId: string;
  debtorName: string;

  // Summary metrics
  totalBalance: number;
  daysOverdue: number;

  // Prioritization
  priorityScore: number;
  priorityLabel: WorkQueuePriority;

  // Action context
  nextActionType: ActionType | null;
  nextActionDue: Date | null;
  lastContactDate: Date | null;
  lastContactType: ActionType | null;

  // Status and flags
  status: WorkQueueItemStatus;
  hasOpenDispute: boolean;
  hasPaymentPlan: boolean;
  tags: string[];

  // Assignment
  assignedToUserId: string | null;
  assignedToName: string | null;
}

/**
 * Summary statistics for the work queue
 */
export interface IWorkQueueSummary {
  totalItems: number;
  totalBalanceInQueue: number;
  avgDaysOverdue: number;
  newItemsCount: number;
  inProgressItemsCount: number;
  followUpItemsCount: number;
  urgentItemsCount: number;
  highPriorityItemsCount: number;
  completedTodayCount: number;
}

/**
 * Query parameters for work queue endpoint
 */
export interface IWorkQueueQuery {
  page?: number;
  pageSize?: number;

  // Filtering
  assignedToUserId?: string;
  priority?: WorkQueuePriority;
  status?: WorkQueueItemStatus;
  searchQuery?: string;
  minBalance?: number;
  maxBalance?: number;
  minDaysOverdue?: number;
  tags?: string[];

  // Sorting
  sortBy?: WorkQueueSortBy;
  sortOrder?: SortOrder;
}

/**
 * Work queue response with items and summary
 */
export interface IWorkQueueResponse {
  items: IWorkQueueItem[];
  summary: IWorkQueueSummary;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}
