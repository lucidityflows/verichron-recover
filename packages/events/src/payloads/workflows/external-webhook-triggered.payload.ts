/**
 * Payload for ExternalWebhookTriggered event
 * Published by api-workflows when triggering external webhook
 */
export interface ExternalWebhookTriggeredPayload {
  organizationId: string;
  
  /** Webhook URL */
  webhookUrl: string;
  
  /** Payload sent to webhook */
  payload: Record<string, any>;
  
  /** Target entity that triggered webhook */
  targetEntityId: string;
  targetEntityType: 'DEBTOR' | 'DEBT';
  
  /** Response from webhook */
  response?: {
    status: number;
    body: any;
  };
  
  /** Error if webhook failed */
  error?: string;
}