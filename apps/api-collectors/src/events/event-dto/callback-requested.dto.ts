import { CallbackRequestSource, WorkQueuePriority } from '@verichron/enums';
import { CallbackRequestedPayload } from '@verichron/events';
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, IsObject } from 'class-validator';

export class CallbackRequestedDto implements CallbackRequestedPayload {
  @IsUUID()
  @IsOptional()
  logId: string | null;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @IsISO8601()
  @IsNotEmpty()
  requestedAt: string;

  @IsEnum(CallbackRequestSource)
  @IsNotEmpty()
  requestSource: CallbackRequestSource;

  @IsString()
  @IsOptional()
  callbackPhone?: string;

  @IsString()
  @IsOptional()
  preferredCallbackTime?: string;

  @IsString()
  @IsOptional()
  callbackReason?: string;

  @IsEnum(WorkQueuePriority)
  @IsOptional()
  urgency?: WorkQueuePriority;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
