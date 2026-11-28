import { ActionType, WorkflowPriority } from '@verichron/enums';

/**
 * Payload for CreateTask command
 * Published by api-workflows to create a collector task
 */
export interface CreateTaskPayload {
  organizationId: string;
  
  /** Collector to assign task to */
  assigneeId: string;
  
  /** Type of task */
  taskType: ActionType;
  
  /** Target entity */
  targetEntityId: string;
  targetEntityType: 'DEBTOR' | 'DEBT';
  
  /** Task due date */
  dueDate: string;
  
  /** Task priority */
  priority: WorkflowPriority;
  
  /** Task description */
  description?: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}