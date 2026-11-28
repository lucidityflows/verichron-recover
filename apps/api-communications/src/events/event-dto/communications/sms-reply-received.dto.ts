import { IsString, IsNotEmpty, IsDateString, IsOptional, IsArray } from 'class-validator';
import { SmsReplyReceivedPayload } from '@verichron/events';

/**
 * Event DTO for SMS Reply Received event
 *
 * Published when a debtor replies to an SMS sent by the collection system.
 * This is a strong engagement signal indicating active communication.
 */
export class SmsReplyReceivedDto implements SmsReplyReceivedPayload {
  @IsString()
  @IsNotEmpty()
  logId: string;

  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  debtorId: string;

  @IsDateString()
  @IsNotEmpty()
  repliedAt: string;

  @IsString()
  @IsNotEmpty()
  replyContent: string;

  @IsString()
  @IsNotEmpty()
  fromPhone: string;

  @IsString()
  @IsNotEmpty()
  toPhone: string;

  @IsString()
  @IsOptional()
  providerMessageId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaUrls?: string[];
}
