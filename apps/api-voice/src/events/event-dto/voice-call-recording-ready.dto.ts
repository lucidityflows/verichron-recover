import { VoiceCallRecordingReadyPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString } from 'class-validator';

export class VoiceCallRecordingReadyDto implements VoiceCallRecordingReadyPayload {
  @IsString()
  @IsNotEmpty()
  callSid: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @IsString()
  @IsNotEmpty()
  recordingUrl: string;
}
