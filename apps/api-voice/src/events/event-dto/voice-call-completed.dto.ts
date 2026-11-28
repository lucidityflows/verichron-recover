import { VoiceCallCompletedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsNumber, IsOptional } from 'class-validator';

export class VoiceCallCompletedDto implements VoiceCallCompletedPayload {
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

  @IsNumber()
  @IsOptional()
  duration?: number;
}
