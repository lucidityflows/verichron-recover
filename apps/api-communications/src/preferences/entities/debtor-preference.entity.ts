import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StateAbbreviation } from '@verichron/enums';

/**
 * Debtor Preference Entity
 *
 * Stores communication preferences for debtors per organization.
 * Enforces compliance rules (FDCPA/TCPA) and debtor opt-out requests.
 *
 * Key Design Notes:
 * - Tenant-Scoped: Preferences are per debtor per organization
 * - Channel-Specific Opt-Outs: Debtors can opt out of specific channels (EMAIL, SMS)
 * - Global Do Not Contact: doNotContact flag overrides all channels
 * - Time Restrictions: Compliance with FDCPA (8am-9pm default, debtor's timezone)
 * - Frequency Limits: Daily contact caps to prevent harassment
 */
@Entity('debtor_preferences')
@Index(['debtorId', 'organizationId'], { unique: true })
@Index(['organizationId'])
export class DebtorPreference {
  @ApiProperty({
    description: 'Unique preference record identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique preference record identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Debtor ID',
    example: '987fcdeb-51a2-43d7-b890-123456789abc',
    format: 'uuid',
  })
  @Column({
    name: 'debtor_id',
    type: 'uuid',
    nullable: false,
    comment: 'Foreign key to debtor (managed by api-debtors)',
  })
  debtorId: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '456fcdeb-51a2-43d7-b890-987654321xyz',
    format: 'uuid',
  })
  @Column({
    name: 'organization_id',
    type: 'uuid',
    nullable: false,
    comment: 'Organization managing these preferences (tenant-scoped)',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Global do not contact flag',
    example: false,
    default: false,
  })
  @Column({
    name: 'do_not_contact',
    type: 'boolean',
    nullable: false,
    default: false,
    comment: 'Global opt-out (overrides all channels)',
  })
  @Index()
  doNotContact: boolean;

  @ApiProperty({
    description: 'Channels debtor has opted out of',
    example: ['SMS'],
    type: [String],
    default: [],
  })
  @Column({
    name: 'opted_out_channels',
    type: 'jsonb',
    nullable: false,
    default: '[]',
    comment: 'Array of opted-out channels: EMAIL, SMS, LETTER',
  })
  optedOutChannels: string[];

  @ApiProperty({
    description: 'Allowed contact start hour (24-hour format)',
    example: 8,
    minimum: 0,
    maximum: 23,
    default: 8,
  })
  @Column({
    name: 'allowed_start_hour',
    type: 'int',
    nullable: false,
    default: 8,
    comment: 'FDCPA compliance: earliest hour for contact',
  })
  allowedStartHour: number;

  @ApiProperty({
    description: 'Allowed contact end hour (24-hour format)',
    example: 21,
    minimum: 0,
    maximum: 23,
    default: 21,
  })
  @Column({
    name: 'allowed_end_hour',
    type: 'int',
    nullable: false,
    default: 21,
    comment: 'FDCPA compliance: latest hour for contact (9pm)',
  })
  allowedEndHour: number;

  @ApiProperty({
    description: 'Maximum communications allowed per day',
    example: 3,
    minimum: 0,
    default: 3,
  })
  @Column({
    name: 'daily_contact_limit',
    type: 'int',
    nullable: false,
    default: 3,
    comment: 'Daily communication frequency limit',
  })
  dailyContactLimit: number;

  @ApiPropertyOptional({
    description: "Debtor's state (2-letter abbreviation)",
    enum: StateAbbreviation,
    enumName: 'StateAbbreviation',
    example: StateAbbreviation.MA,
  })
  @Column({
    name: 'state',
    type: 'enum',
    enum: StateAbbreviation,
    nullable: true,
    comment: 'Debtor state for jurisdiction-specific restrictions',
  })
  state?: StateAbbreviation;

  @ApiPropertyOptional({
    description: "Debtor's timezone (IANA timezone string)",
    example: 'America/New_York',
  })
  @Column({
    name: 'timezone',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Debtor timezone for time-of-day restrictions',
  })
  timezone?: string;

  @ApiProperty({
    description: 'Preferred language for communications',
    example: 'en',
    default: 'en',
  })
  @Column({
    name: 'preferred_language',
    type: 'varchar',
    length: 10,
    nullable: false,
    default: 'en',
    comment: 'ISO 639-1 language code',
  })
  preferredLanguage: string;

  @ApiPropertyOptional({
    description: 'Preferred communication channels (priority order)',
    example: ['EMAIL', 'SMS'],
    type: [String],
  })
  @Column({
    name: 'preferred_channels',
    type: 'jsonb',
    nullable: true,
    comment: 'Ordered list of preferred communication channels',
  })
  preferredChannels?: string[];

  @ApiPropertyOptional({
    description: 'Optional notes about preferences',
    example: 'Debtor requested email-only communication',
  })
  @Column({
    name: 'notes',
    type: 'text',
    nullable: true,
    comment: 'Free-form notes about communication preferences',
  })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when debtor last updated preferences',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @Column({
    name: 'last_updated_by_debtor_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp when debtor self-updated preferences',
  })
  lastUpdatedByDebtorAt?: Date;

  // Audit timestamps
  @ApiProperty({
    description: 'Timestamp when preferences were created',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of preference record creation',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when preferences were last updated',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of last preference update',
  })
  updatedAt: Date;
}
