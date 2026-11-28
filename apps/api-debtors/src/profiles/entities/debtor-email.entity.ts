import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmailCategory } from '@verichron/enums';
import type { DebtorProfileEntity } from './debtor-profile.entity';

/**
 * Debtor Email Entity
 *
 * Represents an email address associated with a debtor.
 * Debtors can have multiple email addresses (personal, work, etc.)
 */
@Entity('debtor_emails')
@Index(['debtorProfileId', 'email'])
export class DebtorEmail {
  @ApiProperty({
    description: 'Unique email record identifier',
    example: '123e4567-e89b-12d3-a456-426614174002',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique email record identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Debtor Profile ID this email belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @Column({
    name: 'debtor_profile_id',
    type: 'uuid',
    nullable: false,
    comment: 'Foreign key to debtor profile',
  })
  debtorProfileId: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john.doe@example.com',
    maxLength: 255,
  })
  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Email address',
  })
  email: string;

  @ApiProperty({
    description: 'Email type/category',
    example: EmailCategory.GENERAL,
    enum: EmailCategory,
  })
  @Column({
    name: 'email_category',
    type: 'enum',
    enum: EmailCategory,
    default: EmailCategory.GENERAL,
    comment: 'Type/category of email',
  })
  @Index()
  emailCategory: EmailCategory;

  @ApiPropertyOptional({
    description: 'Whether this is the primary email',
    example: true,
    default: false,
  })
  @Column({
    name: 'is_primary',
    type: 'boolean',
    default: false,
    comment: 'Flag indicating if this is the primary email',
  })
  @Index()
  isPrimary: boolean;

  @ApiPropertyOptional({
    description: 'Whether this email has been verified',
    example: false,
    default: false,
  })
  @Column({
    name: 'is_verified',
    type: 'boolean',
    default: false,
    comment: 'Flag indicating if email has been verified',
  })
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'Date email was last verified',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @Column({
    name: 'verified_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp of last email verification',
  })
  verifiedAt?: Date;

  @ApiPropertyOptional({
    description: 'Email bounce status',
    example: 'VALID',
    enum: ['VALID', 'BOUNCED', 'SOFT_BOUNCE', 'HARD_BOUNCE', 'COMPLAINED', 'UNKNOWN'],
  })
  @Column({
    name: 'bounce_status',
    type: 'enum',
    enum: ['VALID', 'BOUNCED', 'SOFT_BOUNCE', 'HARD_BOUNCE', 'COMPLAINED', 'UNKNOWN'],
    default: 'UNKNOWN',
    comment: 'Email deliverability status',
  })
  bounceStatus: 'VALID' | 'BOUNCED' | 'SOFT_BOUNCE' | 'HARD_BOUNCE' | 'COMPLAINED' | 'UNKNOWN';

  @ApiPropertyOptional({
    description: 'Timestamp of last bounce event',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @Column({
    name: 'last_bounced_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp of last bounce event',
  })
  lastBouncedAt?: Date;

  // Relationship
  @ManyToOne('DebtorProfileEntity', (debtorProfile: any) => debtorProfile.emails, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'debtor_profile_id' })
  debtorProfile: DebtorProfileEntity;

  // Audit timestamps
  @ApiProperty({
    description: 'Timestamp when email was created',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of email record creation',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when email was last updated',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of last email record update',
  })
  updatedAt: Date;
}
