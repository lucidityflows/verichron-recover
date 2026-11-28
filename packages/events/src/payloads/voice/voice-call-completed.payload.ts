/**
 * Payload for VOICE_VOICE_CALL_COMPLETED event
 */
export interface VoiceCallCompletedPayload {
  callSid: string;
  organizationId: string;
  debtorId: string;
  agentId: string;
  duration?: number;
}
