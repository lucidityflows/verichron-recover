/**
 * Payload for VOICE_VOICE_CALL_RECORDING_READY event
 */
export interface VoiceCallRecordingReadyPayload {
  callSid: string;
  organizationId: string;
  debtorId: string;
  recordingUrl: string;
}
