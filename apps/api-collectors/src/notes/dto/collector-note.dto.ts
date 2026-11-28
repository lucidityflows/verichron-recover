import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsNumber,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ContentFormat, NoteType } from '@verichron/enums';
import { IDebtorFocusNote } from '@verichron/contracts';

/**
 * DTO for file attachment
 */
export class FileAttachmentDto {
  @ApiProperty({
    description: 'Attachment ID (document ID or file identifier)',
    example: 'doc-uuid-123',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'payment_agreement.pdf',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'File URL or storage path',
    example: 'https://storage.example.com/files/payment_agreement.pdf',
  })
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
    example: 245760,
  })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'MIME type',
    example: 'application/pdf',
  })
  @IsOptional()
  @IsString()
  mimeType?: string;
}

/**
 * DTO for creating a new collector note
 */
export class CreateCollectorNoteDto {
  @ApiProperty({
    description: 'Type of note',
    enum: NoteType,
    enumName: 'NoteType',
    example: NoteType.GENERAL,
    default: NoteType.GENERAL,
  })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @ApiPropertyOptional({
    description: 'User ID this note is about (for coaching/performance notes)',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @ApiPropertyOptional({
    description: 'Debtor ID this note is about (for general notes)',
    example: '7f9c8e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  debtorId?: string;

  @ApiPropertyOptional({
    description: 'Brief note title/subject',
    example: 'Payment arrangement discussion',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({
    description: 'Note content',
    example: '<p>Spoke with debtor about setting up payment plan.</p>',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Content format type',
    enum: ContentFormat,
    enumName: 'ContentFormat',
    example: ContentFormat.HTML,
    default: ContentFormat.PLAINTEXT,
  })
  @IsOptional()
  @IsEnum(ContentFormat)
  contentFormat?: ContentFormat;

  @ApiPropertyOptional({
    description: 'Tags/categories for organizing notes',
    example: ['payment-plan', 'follow-up'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether this note should be pinned',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @ApiPropertyOptional({
    description: 'File attachments',
    type: [FileAttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FileAttachmentDto)
  attachments?: FileAttachmentDto[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { sentiment: 'positive' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating an existing collector note
 */
export class UpdateCollectorNoteDto extends PartialType(CreateCollectorNoteDto) {
  // All fields optional for partial updates
  // debtorId and targetUserId are excluded since it cannot be changed
}

/**
 * Response DTO for collector note
 */
export class CollectorNoteResponseDto implements IDebtorFocusNote {
  @ApiProperty({
    description: 'Unique note identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Type of note',
    enum: NoteType,
    enumName: 'NoteType',
    example: NoteType.GENERAL,
  })
  type: NoteType;

  @ApiProperty({
    description: 'Collector user ID who created this note',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  collectorUserId: string;

  @ApiProperty({
    description: 'ID of the user who created the note (alias for collectorUserId)',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  createdBy: string;

  @ApiProperty({
    description: 'Name of the user who created the note',
    example: 'Jane Smith',
  })
  createdByName: string;

  @ApiPropertyOptional({
    description: 'User ID this note is about (for coaching/performance notes)',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  targetUserId?: string;

  @ApiPropertyOptional({
    description: 'Debtor ID this note is about (for general notes)',
    example: '7f9c8e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  debtorId: string | null;

  @ApiPropertyOptional({
    description: 'Note title',
    example: 'Payment arrangement discussion',
  })
  title?: string;

  @ApiProperty({
    description: 'Note content',
    example: '<p>Spoke with debtor about setting up payment plan.</p>',
  })
  content: string;

  @ApiProperty({
    description: 'Content format type',
    enum: ContentFormat,
    enumName: 'ContentFormat',
    example: ContentFormat.HTML,
  })
  contentFormat: ContentFormat;

  @ApiProperty({
    description: 'Tags/categories',
    example: ['payment-plan', 'follow-up'],
    type: [String],
  })
  tags: string[];

  @ApiProperty({
    description: 'Whether this note is pinned',
    example: false,
  })
  isPinned: boolean;

  @ApiProperty({
    description: 'Whether note was generated by system',
    example: false,
  })
  isSystemGenerated: boolean;

  @ApiPropertyOptional({
    description: 'Debt ID related to this note',
    example: 'debt-uuid-123',
    nullable: true,
  })
  debtId: string | null;

  @ApiPropertyOptional({
    description: 'File attachments',
    type: [FileAttachmentDto],
  })
  attachments?: FileAttachmentDto[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Timestamp when note was created',
    example: '2024-12-15T10:00:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when note was last updated',
    example: '2024-12-16T14:30:00Z',
    type: 'string',
    format: 'date-time',
  })
  @Type(() => Date)
  updatedAt: Date;
}

/**
 * Query DTO for searching/filtering notes
 */
export class SearchNotesQueryDto {
  @ApiPropertyOptional({
    description: 'Search query (searches title and content)',
    example: 'payment plan',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by note type',
    enum: NoteType,
    enumName: 'NoteType',
    example: NoteType.GENERAL,
  })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @ApiPropertyOptional({
    description: 'Filter by target user ID (coaching notes)',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @ApiPropertyOptional({
    description: 'Filter by debtor ID (general notes)',
    example: '7f9c8e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  debtorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags (comma-separated)',
    example: 'payment-plan,follow-up',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: 'Filter to only pinned notes',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  pinnedOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of results',
    example: 50,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of results to skip (pagination)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}

/**
 * DTO for toggling pin status
 */
export class TogglePinDto {
  @ApiProperty({
    description: 'Whether to pin or unpin the note',
    example: true,
  })
  @IsBoolean()
  isPinned: boolean;
}