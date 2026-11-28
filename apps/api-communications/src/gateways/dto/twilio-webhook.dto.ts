import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsInt,
  IsNumberString,
} from 'class-validator';

/**
 * DTO for Twilio SMS webhook events
 *
 * Twilio sends webhook notifications for SMS message status updates:
 * - queued, sent, delivered, failed, undelivered
 *
 * Reference: https://www.twilio.com/docs/sms/api/message-resource#message-status-values
 */
export class TwilioWebhookDto {
  @ApiProperty({
    description: 'Twilio message SID (unique identifier)',
    example: 'SM1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  MessageSid: string;

  @ApiProperty({
    description: 'Message status',
    example: 'delivered',
    enum: [
      'queued',
      'sending',
      'sent',
      'delivered',
      'undelivered',
      'failed',
      'receiving',
      'received',
    ],
  })
  @IsEnum([
    'queued',
    'sending',
    'sent',
    'delivered',
    'undelivered',
    'failed',
    'receiving',
    'received',
  ])
  @IsNotEmpty()
  MessageStatus: string;

  @ApiProperty({
    description: 'Recipient phone number (E.164 format)',
    example: '+11234567890',
  })
  @IsString()
  @IsNotEmpty()
  To: string;

  @ApiProperty({
    description: 'Sender phone number (E.164 format)',
    example: '+10987654321',
  })
  @IsString()
  @IsNotEmpty()
  From: string;

  @ApiPropertyOptional({
    description: 'SMS message body',
    example: 'Your payment of $123.45 is due on 2024-02-01.',
  })
  @IsString()
  @IsOptional()
  Body?: string;

  @ApiPropertyOptional({
    description: 'Number of message segments',
    example: '1',
  })
  @IsNumberString()
  @IsOptional()
  NumSegments?: string;

  @ApiPropertyOptional({
    description: 'Twilio account SID',
    example: 'AC_EXAMPLE_ACCOUNT_SID',
  })
  @IsString()
  @IsOptional()
  AccountSid?: string;

  @ApiPropertyOptional({
    description: 'Messaging service SID (if using messaging service)',
    example: 'MG1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsOptional()
  MessagingServiceSid?: string;

  @ApiPropertyOptional({
    description: 'Error code (for failed/undelivered messages)',
    example: '30003',
  })
  @IsString()
  @IsOptional()
  ErrorCode?: string;

  @ApiPropertyOptional({
    description: 'Error message (for failed/undelivered messages)',
    example: 'Unreachable destination handset',
  })
  @IsString()
  @IsOptional()
  ErrorMessage?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when message was sent (RFC 2822 format)',
    example: 'Mon, 15 Jan 2024 10:30:00 +0000',
  })
  @IsString()
  @IsOptional()
  DateSent?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when message was created (RFC 2822 format)',
    example: 'Mon, 15 Jan 2024 10:30:00 +0000',
  })
  @IsString()
  @IsOptional()
  DateCreated?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when status was last updated (RFC 2822 format)',
    example: 'Mon, 15 Jan 2024 10:30:05 +0000',
  })
  @IsString()
  @IsOptional()
  DateUpdated?: string;

  @ApiPropertyOptional({
    description: 'Price of the message',
    example: '-0.00750',
  })
  @IsString()
  @IsOptional()
  Price?: string;

  @ApiPropertyOptional({
    description: 'Price unit (currency)',
    example: 'USD',
  })
  @IsString()
  @IsOptional()
  PriceUnit?: string;

  @ApiPropertyOptional({
    description: 'Message direction (inbound/outbound)',
    example: 'outbound-api',
  })
  @IsString()
  @IsOptional()
  Direction?: string;

  @ApiPropertyOptional({
    description: 'API version used',
    example: '2010-04-01',
  })
  @IsString()
  @IsOptional()
  ApiVersion?: string;

  // Note: Index signature for additional Twilio metadata
  // Decorators cannot be applied to index signatures
  [key: string]: any;
}
