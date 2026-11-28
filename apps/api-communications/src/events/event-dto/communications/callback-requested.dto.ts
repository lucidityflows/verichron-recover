import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { CallbackRequestedPayload } from '@verichron/events';
import { CallbackRequestSource, WorkQueuePriority } from '@verichron/enums';

/**
 * Event DTO for Callback Requested event
 *
 * Published when a debtor requests a callback through various channels.
 * This is a strong engagement signal that requires collector follow-up.
 */
export class CallbackRequestedDto implements CallbackRequestedPayload {
  @IsString()
  @IsOptional()
  logId: string | null;

  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  debtorId: string;

  @IsDateString()
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
