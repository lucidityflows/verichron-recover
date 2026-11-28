import { WorkflowPriority } from "@verichron/enums";

/**
 * Payload for UpdatePriority command
 * Published by api-workflows to update debt priority
 */
export interface UpdatePriorityPayload {
  organizationId: string;
  
  /** Target entity */
  targetEntityId: string;
  targetEntityType: 'DEBTOR' | 'DEBT';
  
  /** New priority value */
  newPriority: WorkflowPriority;
  
  /** Reason for priority change */
  reason?: string;
}