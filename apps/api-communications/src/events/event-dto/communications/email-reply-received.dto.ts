import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';
import { EmailReplyReceivedPayload } from '@verichron/events';

/**
 * Event DTO for Email Reply Received event
 *
 * Published when a debtor replies to an email sent by the collection system.
 * This is a strong engagement signal indicating active communication.
 */
export class EmailReplyReceivedDto implements EmailReplyReceivedPayload {
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
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  replyContent?: string;

  @IsString()
  @IsNotEmpty()
  fromEmail: string;

  @IsString()
  @IsNotEmpty()
  toEmail: string;

  @IsString()
  @IsOptional()
  providerMessageId?: string;
}
