import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Status History Entry
 *
 * Append-only record of status changes for audit trail.
 */
export class StatusHistoryEntry {
  @ApiProperty({
    description: 'Status at this point in time',
    example: 'DELIVERED',
    enum: ['SENDING', 'SENT', 'DELIVERED', 'FAILED', 'OPENED', 'CLICKED', 'BLOCKED'],
  })
  @Prop({ required: true })
  status: string;

  @ApiProperty({
    description: 'Timestamp of status change',
    example: '2024-01-15T10:30:00Z',
  })
  @Prop({ required: true, type: Date })
  timestamp: Date;

  @ApiPropertyOptional({
    description: 'Additional metadata about status change',
    example: { provider: 'sendgrid', event: 'delivered' },
  })
  @Prop({ type: Types.Map })
  metadata?: Record<string, any>;
}

/**
 * Communication Content
 *
 * Stores the actual content that was sent (subject and body).
 * Useful for audit trail and resend operations.
 */
export class CommunicationContent {
  @ApiPropertyOptional({
    description: 'Email subject line (emails only)',
    example: 'Payment Receipt - $100.00',
  })
  @Prop()
  subject?: string;

  @ApiProperty({
    description: 'Message body (HTML for email, plain text for SMS)',
    example: '<p>Thank you for your payment.</p>',
  })
  @Prop({ required: true })
  body: string;
}

/**
 * Communication Log Schema (MongoDB)
 *
 * Immutable, append-only log of all communication attempts.
 * High-volume, write-heavy data optimized for MongoDB.
 *
 * Key Design Notes:
 * - Append-Only: Status updates append to statusHistory, never overwrite
 * - Indexed for Performance: Common query patterns (debtor history, status tracking, webhook lookups)
 * - Flexible Schema: Metadata field supports provider-specific data
 * - Audit Trail: Complete history of every status change with timestamps
 * - Compliance: 7-year retention for regulatory requirements
 */
@Schema({
  collection: 'communication_logs',
  timestamps: true,
  versionKey: false,
})
export class CommunicationLog extends Document {
  @ApiProperty({
    description: 'MongoDB ObjectId',
    example: '507f1f77bcf86cd799439011',
  })
  _id: Types.ObjectId;

  @ApiProperty({
    description: 'Organization ID',
    example: '987fcdeb-51a2-43d7-b890-123456789abc',
  })
  @Prop({ required: true, index: true })
  organizationId: string;

  @ApiProperty({
    description: 'Debtor ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Prop({ required: true, index: true })
  debtorId: string;

  @ApiPropertyOptional({
    description: 'Debt ID (if communication is debt-specific)',
    example: '456fcdeb-51a2-43d7-b890-987654321xyz',
  })
  @Prop({ index: true })
  debtId?: string;

  @ApiPropertyOptional({
    description: 'Collector User ID (if communication was initiated by a collector)',
    example: '789fcdeb-51a2-43d7-b890-123456789xyz',
  })
  @Prop({ index: true })
  collectorUserId?: string;

  @ApiProperty({
    description: 'Communication type',
    example: 'EMAIL',
    enum: ['EMAIL', 'SMS', 'LETTER', 'CALL'],
    enumName: 'CommunicationType',
  })
  @Prop({ required: true, enum: ['EMAIL', 'SMS', 'LETTER', 'CALL'], index: true })
  type: 'EMAIL' | 'SMS' | 'LETTER' | 'CALL';

  @ApiProperty({
    description: 'Current communication status',
    example: 'DELIVERED',
    enum: ['SENDING', 'SENT', 'DELIVERED', 'FAILED', 'OPENED', 'CLICKED', 'BLOCKED'],
    enumName: 'CommunicationStatus',
  })
  @Prop({
    required: true,
    enum: ['SENDING', 'SENT', 'DELIVERED', 'FAILED', 'OPENED', 'CLICKED', 'BLOCKED'],
    index: true,
  })
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'OPENED' | 'CLICKED' | 'BLOCKED';

  @ApiPropertyOptional({
    description: 'Gateway provider used',
    example: 'sendgrid',
    enum: ['sendgrid', 'twilio', 'mock'],
  })
  @Prop()
  provider?: string;

  @ApiPropertyOptional({
    description: 'Provider-specific message ID (for webhook lookups)',
    example: 'msg_abc123def456',
  })
  @Prop()
  providerMessageId?: string;

  @ApiPropertyOptional({
    description: 'Template ID used to generate content',
    example: '789fcdeb-51a2-43d7-b890-123456789xyz',
  })
  @Prop()
  templateId?: string;

  @ApiPropertyOptional({
    description: 'Template name (for reference)',
    example: 'payment-receipt',
  })
  @Prop()
  templateName?: string;

  @ApiPropertyOptional({
    description: 'Communication content (subject and body)',
  })
  @Prop({ type: CommunicationContent })
  content?: CommunicationContent;

  @ApiPropertyOptional({
    description: 'Timestamp when communication was sent to gateway',
    example: '2024-01-15T10:30:00Z',
  })
  @Prop({ type: Date, index: true })
  sentAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when communication was delivered to recipient',
    example: '2024-01-15T10:31:00Z',
  })
  @Prop({ type: Date })
  deliveredAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when email was opened by recipient',
    example: '2024-01-15T11:00:00Z',
  })
  @Prop({ type: Date })
  openedAt?: Date;

  @ApiPropertyOptional({
    description: 'Timestamp when link in email was clicked',
    example: '2024-01-15T11:05:00Z',
  })
  @Prop({ type: Date })
  clickedAt?: Date;

  @ApiPropertyOptional({
    description: 'Reason communication was blocked (compliance violation)',
    example: 'Time restriction: Outside allowed hours (8am-9pm)',
  })
  @Prop()
  blockedReason?: string;

  @ApiPropertyOptional({
    description: 'Reason communication failed',
    example: 'Invalid email address',
  })
  @Prop()
  failureReason?: string;

  @ApiProperty({
    description: 'Append-only status history (audit trail)',
    type: [StatusHistoryEntry],
  })
  @Prop({ required: true, type: [StatusHistoryEntry], default: [] })
  statusHistory: StatusHistoryEntry[];

  @ApiPropertyOptional({
    description: 'Additional metadata (provider-specific, event context, etc.)',
    example: { campaignId: 'spring-2024', priority: 'high' },
  })
  @Prop({ type: Types.Map })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Timestamp when log was created',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when log was last updated',
    example: '2024-01-15T10:31:00Z',
  })
  updatedAt: Date;
}

export const CommunicationLogSchema = SchemaFactory.createForClass(CommunicationLog);

/**
 * Indexes for Performance
 *
 * Optimized for common query patterns:
 * 1. Debtor communication history (organizationId + debtorId + sentAt)
 * 2. Webhook lookups (providerMessageId)
 * 3. Status-based queries (status + sentAt)
 * 4. Organization analytics (organizationId + sentAt)
 * 5. Collector analytics (organizationId + collectorUserId + sentAt)
 */
CommunicationLogSchema.index({ organizationId: 1, debtorId: 1, sentAt: -1 });
CommunicationLogSchema.index({ providerMessageId: 1 });
CommunicationLogSchema.index({ status: 1, sentAt: -1 });
CommunicationLogSchema.index({ organizationId: 1, sentAt: -1 });
CommunicationLogSchema.index({ organizationId: 1, type: 1, sentAt: -1 });
CommunicationLogSchema.index({ organizationId: 1, collectorUserId: 1, sentAt: -1 });

/**
 * TTL Index for Automatic Archival
 *
 * Automatically remove logs older than 7 years (regulatory retention requirement).
 * Consider moving to cold storage instead of deletion for audit purposes.
 */
// CommunicationLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 220898400 }); // 7 years in seconds
