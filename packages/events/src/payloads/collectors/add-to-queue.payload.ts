/**
 * Payload for AddToQueue command
 * Published by api-workflows to add debtor to specific queue
 */
export interface AddToQueuePayload {
  organizationId: string;
  
  /** Queue identifier */
  queueId: string;
  
  /** Target entity */
  targetEntityId: string;
  targetEntityType: 'DEBTOR' | 'DEBT';
  
  /** Queue priority override */
  priorityOverride?: number;
  
  /** Tags to add */
  tags?: string[];
}