/**
 * Payload for SendNotification command
 * Published by api-workflows to send in-app notification
 */
export interface SendNotificationCommandPayload {
  organizationId: string;
  
  /** User to notify */
  userId: string;
  
  /** Notification message */
  message: string;
  
  /** Notification type */
  notificationType: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  
  /** Target entity for context */
  targetEntityId: string;
  targetEntityType: 'DEBTOR' | 'DEBT';
  
  /** Action URL if notification is clickable */
  actionUrl?: string;
}