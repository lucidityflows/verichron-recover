/**
 * Payload for VOICE_VOICE_CALL_STARTED event
 */
export interface VoiceCallStartedPayload {
  callSid: string;
  organizationId: string;
  debtorId: string;
  agentId: string;
}
