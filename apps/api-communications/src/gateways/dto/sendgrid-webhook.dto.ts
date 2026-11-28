import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsInt,
  IsOptional,
  IsEnum,
} from 'class-validator';

/**
 * DTO for SendGrid webhook events
 *
 * SendGrid sends webhook notifications for various email events:
 * - processed, delivered, open, click, bounce, dropped, deferred, etc.
 *
 * Reference: https://docs.sendgrid.com/for-developers/tracking-events/event
 */
export class SendGridWebhookDto {
  @ApiProperty({
    description: 'SendGrid event type',
    example: 'delivered',
    enum: [
      'processed',
      'dropped',
      'delivered',
      'deferred',
      'bounce',
      'open',
      'click',
      'spam_report',
      'unsubscribe',
      'group_unsubscribe',
      'group_resubscribe',
    ],
  })
  @IsEnum([
    'processed',
    'dropped',
    'delivered',
    'deferred',
    'bounce',
    'open',
    'click',
    'spam_report',
    'unsubscribe',
    'group_unsubscribe',
    'group_resubscribe',
  ])
  @IsNotEmpty()
  event: string;

  @ApiProperty({
    description: 'Recipient email address',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Unix timestamp when event occurred',
    example: 1705320600,
  })
  @IsInt()
  @IsNotEmpty()
  timestamp: number;

  @ApiProperty({
    description: 'SendGrid message ID',
    example: 'abc123xyz.filterdrecv-p3mdw1-1-64E3F8F8-2.1234567890',
  })
  @IsString()
  @IsNotEmpty()
  sg_message_id: string;

  @ApiPropertyOptional({
    description: 'SendGrid event ID (unique for each event)',
    example: 'ZXZlbnRfaWRfMTIzNDU2Nzg5MA',
  })
  @IsString()
  @IsOptional()
  sg_event_id?: string;

  @ApiPropertyOptional({
    description: 'Reason for failure/drop (if applicable)',
    example: 'Bounced: 550 5.1.1 The email account that you tried to reach does not exist',
  })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Bounce/drop status code (if applicable)',
    example: '550',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: 'SMTP response (for bounces)',
    example: '550 5.1.1 The email account that you tried to reach does not exist',
  })
  @IsString()
  @IsOptional()
  response?: string;

  @ApiPropertyOptional({
    description: 'Recipient IP address (for opens/clicks)',
    example: '192.0.2.1',
  })
  @IsString()
  @IsOptional()
  ip?: string;

  @ApiPropertyOptional({
    description: 'User agent (for opens/clicks)',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsString()
  @IsOptional()
  useragent?: string;

  @ApiPropertyOptional({
    description: 'URL clicked (for click events)',
    example: 'https://example.com/payment',
  })
  @IsString()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description: 'Custom arguments passed in send request',
    example: 'debtor_id=123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsOptional()
  custom_args?: string;

  @ApiPropertyOptional({
    description: 'Email subject',
    example: 'Payment Reminder',
  })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({
    description: 'Marketing campaign name (if applicable)',
    example: 'monthly-reminders',
  })
  @IsString()
  @IsOptional()
  marketing_campaign_name?: string;

  // Note: Index signature for additional SendGrid metadata
  // Decorators cannot be applied to index signatures
  [key: string]: any;
}
