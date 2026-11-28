import { WorkflowPriority } from "@verichron/enums";

/**
 * Payload for EscalateToManager command
 * Published by api-workflows to escalate a debtor to management
 */
export interface EscalateToManagerPayload {
  organizationId: string;
  
  /** Manager user ID to escalate to */
  managerId: string;
  
  /** Target entity (debtor or debt) */
  targetEntityId: string;
  targetEntityType: 'DEBTOR' | 'DEBT';
  
  /** Reason for escalation */
  reason: string;
  
  /** Escalation priority */
  priority: WorkflowPriority;
  
  /** Additional escalation details */
  escalationDetails?: Record<string, any>;
}