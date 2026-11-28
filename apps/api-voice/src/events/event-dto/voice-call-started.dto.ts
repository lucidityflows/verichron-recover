import { VoiceCallStartedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString } from 'class-validator';

export class VoiceCallStartedDto implements VoiceCallStartedPayload {
  @IsString()
  @IsNotEmpty()
  callSid: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @IsUUID()
  @IsNotEmpty()
  agentId: string;
}
