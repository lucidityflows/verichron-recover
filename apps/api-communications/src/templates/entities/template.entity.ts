import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TemplateType } from '@verichron/enums';

/**
 * Template Entity
 *
 * Stores versioned communication templates for emails, SMS, and letters.
 * Templates use Handlebars syntax for variable substitution.
 *
 * Key Design Notes:
 * - Immutable Versioning: Updates create new versions (increment version number)
 * - Organization-Scoped: Each organization has isolated templates
 * - Type-Specific Fields: subject only for emails
 * - Syntax Validation: Handlebars syntax validated before save
 */
@Entity('templates')
@Index(['organizationId', 'name', 'version'])
@Index(['organizationId', 'isActive'])
export class Template {
  @ApiProperty({
    description: 'Unique template identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique template identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID that owns this template',
    example: '987fcdeb-51a2-43d7-b890-123456789abc',
    format: 'uuid',
  })
  @Column({
    name: 'organization_id',
    type: 'uuid',
    nullable: false,
    comment: 'Organization that owns this template (tenant-scoped)',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Template name (unique per organization)',
    example: 'payment-receipt',
    maxLength: 100,
  })
  @Column({
    name: 'name',
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'Template identifier name',
  })
  name: string;

  @ApiProperty({
    description: 'Display name for template',
    example: 'Payment Receipt Email',
    maxLength: 255,
  })
  @Column({
    name: 'display_name',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Human-readable template name',
  })
  displayName: string;

  @ApiProperty({
    description: 'Template type',
    example: TemplateType.EMAIL,
    enum: TemplateType,
    enumName: 'TemplateType',
  })
  @Column({
    name: 'type',
    type: 'enum',
    enum: TemplateType,
    nullable: false,
    comment: 'Template type (channels that support templated content)',
  })
  @Index()
  type: TemplateType;

  @ApiPropertyOptional({
    description: 'Email subject line (Handlebars template)',
    example: 'Payment Receipt - {{amount}}',
    maxLength: 255,
  })
  @Column({
    name: 'subject',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Email subject (only for EMAIL type)',
  })
  subject?: string;

  @ApiProperty({
    description: 'Template body (Handlebars template)',
    example: '<p>Thank you for your payment of {{currency amount}}.</p>',
  })
  @Column({
    name: 'body',
    type: 'text',
    nullable: false,
    comment: 'Template body (HTML for email, plain text for SMS/LETTER)',
  })
  body: string;

  @ApiProperty({
    description: 'Template version number',
    example: 1,
    minimum: 1,
  })
  @Column({
    name: 'version',
    type: 'int',
    nullable: false,
    default: 1,
    comment: 'Version number (increments on update)',
  })
  version: number;

  @ApiProperty({
    description: 'Whether this template version is active',
    example: true,
    default: true,
  })
  @Column({
    name: 'is_active',
    type: 'boolean',
    nullable: false,
    default: true,
    comment: 'Active status (soft delete via false)',
  })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Optional description of template purpose',
    example: 'Sent after successful payment transaction',
  })
  @Column({
    name: 'description',
    type: 'text',
    nullable: true,
    comment: 'Template description for documentation',
  })
  description?: string;

  @ApiPropertyOptional({
    description: 'JSON array of required context variables',
    example: ['amount', 'transactionId', 'date'],
    type: [String],
  })
  @Column({
    name: 'required_variables',
    type: 'jsonb',
    nullable: true,
    comment: 'List of required Handlebars variables',
  })
  requiredVariables?: string[];

  @ApiPropertyOptional({
    description: 'Optional metadata for template',
    example: { category: 'payment', priority: 'high' },
  })
  @Column({
    name: 'metadata',
    type: 'jsonb',
    nullable: true,
    comment: 'Additional metadata for template categorization',
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'User ID who created this template version',
    example: '456fcdeb-51a2-43d7-b890-987654321xyz',
    format: 'uuid',
  })
  @Column({
    name: 'created_by',
    type: 'uuid',
    nullable: true,
    comment: 'User who created this template version',
  })
  createdBy?: string;

  // Audit timestamps
  @ApiProperty({
    description: 'Timestamp when template was created',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of template creation',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when template was last updated',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of last template update',
  })
  updatedAt: Date;
}
