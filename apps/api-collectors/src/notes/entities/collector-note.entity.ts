import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentFormat, NoteType } from '@verichron/enums';

/**
 * Collector Note Entity
 *
 * Enhanced notes system for collectors with rich text, attachments, tags, and pinning.
 * Separate from CollectorAction for specialized note functionality.
 *
 * Key Design Principles:
 * - Supports General notes (debtor-specific) and Coaching notes (collector-specific)
 * - Rich text support (HTML or Markdown)
 * - File attachments via URLs/document IDs
 * - Tag-based categorization
 * - Pinning for important notes
 * - Full-text search capability
 * - Edit history tracking via updatedAt
 *
 * Authorization:
 * - Collectors can create/edit/delete their own notes
 * - Managers can view all notes in their organization
 */
@Entity({ name: 'collector_notes' })
@Index(['organizationId', 'debtorId'])
@Index(['organizationId', 'collectorUserId'])
@Index(['organizationId', 'targetUserId'])
@Index(['organizationId', 'type'])
@Index(['organizationId', 'debtorId', 'isPinned'])
@Index(['organizationId', 'tags'], { where: "tags IS NOT NULL" })
export class CollectorNote {
  @ApiProperty({
    description: 'Unique note identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization (tenant) that owns this note',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @ApiProperty({
    description: 'Type of note',
    enum: NoteType,
    enumName: 'NoteType',
    example: NoteType.GENERAL,
    default: NoteType.GENERAL,
  })
  @Column({
    name: 'type',
    type: 'varchar',
    length: 20,
    default: NoteType.GENERAL,
  })
  type: NoteType;

  @ApiProperty({
    description: 'Collector user ID who created this note',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @Column({ name: 'collector_user_id', type: 'uuid' })
  @Index()
  collectorUserId: string;

  @ApiPropertyOptional({
    description: 'User ID this note is about (for coaching/performance notes)',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @Column({ name: 'target_user_id', type: 'uuid', nullable: true })
  @Index()
  targetUserId: string | null;

  @ApiPropertyOptional({
    description: 'Debtor ID this note is about (for general notes)',
    example: '7f9c8e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @Column({ name: 'debtor_id', type: 'uuid', nullable: true })
  @Index()
  debtorId: string | null;

  @ApiPropertyOptional({
    description: 'Brief note title/subject',
    example: 'Payment arrangement discussion',
    maxLength: 255,
  })
  @Column({ name: 'title', type: 'varchar', length: 255, nullable: true })
  title: string | null;

  @ApiProperty({
    description: 'Note content (supports rich text as HTML or Markdown)',
    example: '<p>Spoke with debtor about setting up payment plan. <strong>Agreed to $500/month</strong> starting next week.</p>',
  })
  @Column({ name: 'content', type: 'text' })
  content: string;

  @ApiPropertyOptional({
    description: 'Content format type',
    enum: ContentFormat,
    enumName: 'ContentFormat',
    example: ContentFormat.HTML,
    default: ContentFormat.PLAINTEXT,
  })
  @Column({ name: 'content_format', type: 'varchar', length: 20, default: ContentFormat.PLAINTEXT })
  contentFormat: ContentFormat;

  @ApiPropertyOptional({
    description: 'Tags/categories for organizing notes',
    example: ['payment-plan', 'follow-up', 'urgent'],
    type: [String],
  })
  @Column({ name: 'tags', type: 'text', array: true, default: [] })
  tags: string[];

  @ApiProperty({
    description: 'Whether this note is pinned to top',
    example: false,
    default: false,
  })
  @Column({ name: 'is_pinned', type: 'boolean', default: false })
  isPinned: boolean;

  @ApiPropertyOptional({
    description: 'File attachments (document IDs or URLs)',
    example: ['doc-uuid-1', 'doc-uuid-2'],
    type: [String],
  })
  @Column({ name: 'attachments', type: 'jsonb', nullable: true })
  attachments: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    mimeType?: string;
  }> | null;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { sentiment: 'positive', followUpDate: '2024-12-20' },
  })
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @ApiProperty({
    description: 'Timestamp when note was created',
    example: '2024-12-15T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when note was last updated',
    example: '2024-12-16T14:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
