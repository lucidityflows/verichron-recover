import { AutoAssignmentFilters } from '@verichron/contracts';

/**
 * Payload for AUTOMATIONS.EXECUTE_AUTO_ASSIGNMENT command
 * Published by: api-workflows
 * Consumed by: api-automations
 */
export interface ExecuteAutoAssignmentPayload {
  organizationId: string;
  configId: string;
  configName: string;
  strategy: string; // AutoAssignmentStrategy enum value
  collectorPool: string[];
  excludeCollectors?: string[];
  maxAssignmentsPerDay?: number;
  workloadThreshold?: number;
  lastAssignedCollectorId?: string;
  dailyAssignmentCounts?: Record<string, Record<string, number>>;
  filters?: AutoAssignmentFilters;
  targetEntityId: string;
  targetEntityType: string;
  targetEntityData?: Record<string, any>;
  correlationId?: string;
}
