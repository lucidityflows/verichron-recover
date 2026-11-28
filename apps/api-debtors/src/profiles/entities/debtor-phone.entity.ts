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
import { PhoneCategory } from '@verichron/enums';
import type { DebtorProfileEntity } from './debtor-profile.entity';

/**
 * Debtor Phone Entity
 *
 * Represents a phone number associated with a debtor.
 * Debtors can have multiple phone numbers (mobile, home, work, etc.)
 */
@Entity('debtor_phones')
@Index(['debtorProfileId', 'phoneNumber'])
export class DebtorPhone {
  @ApiProperty({
    description: 'Unique phone record identifier',
    example: '123e4567-e89b-12d3-a456-426614174003',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique phone record identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Debtor Profile ID this phone belongs to',
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
    description: 'Phone number (formatted)',
    example: '+1-555-123-4567',
    maxLength: 20,
  })
  @Column({
    name: 'phone_number',
    type: 'varchar',
    length: 20,
    nullable: false,
    comment: 'Phone number',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Phone type/category',
    example: PhoneCategory.MOBILE,
    enum: PhoneCategory,
  })
  @Column({
    name: 'category',
    type: 'enum',
    enum: PhoneCategory,
    default: PhoneCategory.MOBILE,
    comment: 'Type/category of phone number',
  })
  @Index()
  category: PhoneCategory;

  @ApiPropertyOptional({
    description: 'Whether this is the primary phone number',
    example: true,
    default: false,
  })
  @Column({
    name: 'is_primary',
    type: 'boolean',
    default: false,
    comment: 'Flag indicating if this is the primary phone',
  })
  @Index()
  isPrimary: boolean;

  @ApiPropertyOptional({
    description: 'Whether this phone has been verified',
    example: false,
    default: false,
  })
  @Column({
    name: 'is_verified',
    type: 'boolean',
    default: false,
    comment: 'Flag indicating if phone has been verified',
  })
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'Date phone was last verified',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @Column({
    name: 'verified_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp of last phone verification',
  })
  verifiedAt?: Date;

  @ApiPropertyOptional({
    description: 'Whether this phone can receive SMS messages',
    example: true,
    default: false,
  })
  @Column({
    name: 'can_receive_sms',
    type: 'boolean',
    default: false,
    comment: 'Flag indicating if phone can receive SMS',
  })
  canReceiveSms: boolean;

  @ApiPropertyOptional({
    description: 'Whether this phone can receive calls',
    example: true,
    default: true,
  })
  @Column({
    name: 'can_receive_calls',
    type: 'boolean',
    default: true,
    comment: 'Flag indicating if phone can receive calls',
  })
  canReceiveCalls: boolean;

  @ApiPropertyOptional({
    description: 'Whether debtor opted out of communications on this number',
    example: false,
    default: false,
  })
  @Column({
    name: 'is_opted_out',
    type: 'boolean',
    default: false,
    comment: 'Flag indicating if debtor opted out of communications',
  })
  isOptedOut: boolean;

  @ApiPropertyOptional({
    description: 'Timestamp when debtor opted out',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @Column({
    name: 'opted_out_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp when debtor opted out',
  })
  optedOutAt?: Date;

  // Relationship
  @ManyToOne('DebtorProfileEntity', (debtorProfile: any) => debtorProfile.phones, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'debtor_profile_id' })
  debtorProfile: DebtorProfileEntity;

  // Audit timestamps
  @ApiProperty({
    description: 'Timestamp when phone was created',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of phone record creation',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when phone was last updated',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of last phone record update',
  })
  updatedAt: Date;
}
