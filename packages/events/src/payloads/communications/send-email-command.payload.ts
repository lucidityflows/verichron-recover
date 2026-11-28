/**
 * Payload for SendEmail command
 * Published by api-workflows to trigger email send
 */
export interface SendEmailCommandPayload {
  organizationId: string;
  
  /** Recipient email or debtor ID */
  recipient: string;
  
  /** Email template ID */
  templateId: string;
  
  /** Template context/variables */
  context: Record<string, any>;
  
  /** Target entity for logging */
  targetEntityId: string;
  targetEntityType: 'DEBTOR' | 'DEBT';
  
  /** Correlation ID for tracking */
  correlationId?: string;
}