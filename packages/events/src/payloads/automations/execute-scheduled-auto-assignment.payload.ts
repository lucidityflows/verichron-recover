import { AutoAssignmentFilters } from '@verichron/contracts';
import { AutoAssignmentStrategy } from '@verichron/enums';

/**
 * Payload for AUTOMATIONS.EXECUTE_SCHEDULED_AUTO_ASSIGNMENT command
 * Published by: api-workflows (scheduler)
 * Consumed by: api-automations
 */
export interface ExecuteScheduledAutoAssignmentPayload {
  organizationId: string;
  configId: string;
  configName: string;
  strategy: AutoAssignmentStrategy;
  collectorPool: string[];
  excludeCollectors?: string[];
  maxAssignmentsPerDay?: number;
  workloadThreshold?: number;
  lastAssignedCollectorId?: string;
  dailyAssignmentCounts?: Record<string, Record<string, number>>;
  filters?: AutoAssignmentFilters;
}
