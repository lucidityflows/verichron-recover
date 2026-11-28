import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty} from '@nestjs/swagger';
import { DebtorAddress } from './debtor-address.entity';
import { DebtorEmail } from './debtor-email.entity';
import { DebtorPhone } from './debtor-phone.entity';
import { DebtorVerificationStatus, DebtorProfileStatus } from '@verichron/enums';
import type { DebtorIdentityEntity } from '../../identity/entities/debtor-identity.entity';

/**
 * DebtorProfile Entity
 *
 * Represents a debtor's organization-specific profile.
 * This is the data and context for a person within a single organization.
 *
 * Key Characteristics:
 * - ONE profile per person per organization
 * - Links to global DebtorIdentity (represents the same person)
 * - Organization-scoped (all data belongs to one organization)
 * - Contact info, notes, verification status are org-specific
 * - Unique constraint on (debtorIdentityId, organizationId)
 *
 * Example:
 * Diana Prince (DebtorIdentity) has:
 * - ONE profile in Stark Industries
 * - ONE profile in Wayne Enterprises
 * - Each profile can have different contact info, notes, verification status
 */
@Entity('debtor_profiles')
@Index(['firstName', 'lastName', 'dateOfBirth'], { unique: false })
@Unique('uq_debtor_identity_organization', ['debtorIdentityId', 'organizationId'])
export class DebtorProfileEntity {
  @ApiProperty({
    description: 'Unique debtor profile identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique debtor profile identifier',
  })
  id: string;

  /**
   * Link to the global debtor identity.
   * Multiple profiles can share the same identity (one per organization).
   */
  @ApiProperty({
    description: 'Debtor identity ID (global identifier for the person)',
    example: '789fcdeb-51a2-43d7-b890-123456789abc',
    format: 'uuid',
  })
  @Column({
    name: 'debtor_identity_id',
    type: 'uuid',
    nullable: false,
    comment: 'Foreign key to debtor_identities - global person identifier',
  })
  @Index('idx_debtor_profile_identity')
  debtorIdentityId: string;

  @ManyToOne('DebtorIdentityEntity', (identity: any) => identity.profiles, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'debtor_identity_id' })
  debtorIdentity: DebtorIdentityEntity;

  @ApiProperty({
    description: 'Debtor first name',
    example: 'John',
    minLength: 1,
    maxLength: 100,
  })
  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'Debtor first name',
  })
  @Index()
  firstName: string;

  @ApiProperty({
    description: 'Debtor last name',
    example: 'Doe',
    minLength: 1,
    maxLength: 100,
  })
  @Column({
    name: 'last_name',
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'Debtor last name',
  })
  @Index()
  lastName: string;

  @ApiProperty({
    description: 'Debtor middle name',
    example: 'Michael',
    maxLength: 100,
    required: false,
  })
  @Column({
    name: 'middle_name',
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: 'Debtor middle name (optional)',
  })
  middleName?: string;

  @ApiProperty({
    description: 'Debtor date of birth',
    example: '1985-06-15',
    format: 'date',
    required: false,
  })
  @Column({
    name: 'date_of_birth',
    type: 'date',
    nullable: true,
    comment: 'Debtor date of birth for identity verification',
  })
  @Index()
  dateOfBirth?: Date;

  @ApiProperty({
    description: 'Organization ID that owns this debtor profile',
    example: '789fcdeb-51a2-43d7-b890-987654321xyz',
    format: 'uuid',
  })
  @Column({
    name: 'organization_id',
    type: 'uuid',
    nullable: false,
    comment: 'Foreign key to organization that owns this profile',
  })
  @Index('idx_debtor_profile_organization')
  organizationId: string;

  @ApiProperty({
    description: 'Lifecycle status of debtor profile',
    example: DebtorProfileStatus.ACTIVE,
    enum: DebtorProfileStatus,
    default: DebtorProfileStatus.PENDING_INVITATION,
  })
  @Column({
    name: 'status',
    type: 'enum',
    enum: DebtorProfileStatus,
    default: DebtorProfileStatus.PENDING_INVITATION,
    comment: 'Current lifecycle status of debtor profile (PENDING_INVITATION, INVITED, ACTIVE, INACTIVE, SUSPENDED)',
  })
  @Index('idx_debtor_profile_status')
  status: DebtorProfileStatus;

  @ApiProperty({
    description: 'Timestamp when invitation was sent to debtor',
    example: '2024-01-10T09:00:00Z',
    format: 'date-time',
    required: false,
  })
  @Column({
    name: 'invited_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp when debtor was invited to access this organization',
  })
  invitedAt?: Date;

  @ApiProperty({
    description: 'Timestamp when debtor accepted invitation',
    example: '2024-01-12T14:30:00Z',
    format: 'date-time',
    required: false,
  })
  @Column({
    name: 'accepted_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp when debtor accepted invitation and gained access',
  })
  @Index('idx_debtor_profile_accepted_at')
  acceptedAt?: Date;

  @ApiProperty({
    description: 'Verification status of debtor information',
    example: DebtorVerificationStatus.VERIFIED,
    enum: DebtorVerificationStatus,
    default: DebtorVerificationStatus.UNVERIFIED,
  })
  @Column({
    name: 'verification_status',
    type: 'enum',
    enum: DebtorVerificationStatus,
    default: DebtorVerificationStatus.UNVERIFIED,
    comment: 'Current verification status of debtor data',
  })
  @Index()
  verificationStatus: DebtorVerificationStatus;

  @ApiProperty({
    description: 'Timestamp of last verification attempt',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
    required: false,
  })
  @Column({
    name: 'last_verified_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp of most recent verification attempt',
  })
  lastVerifiedAt?: Date;

  @ApiProperty({
    description: 'Additional notes about the debtor (organization-specific)',
    example: 'Prefers email communication',
    required: false,
  })
  @Column({
    name: 'notes',
    type: 'text',
    nullable: true,
    comment: 'Free-form notes about debtor (org-specific)',
  })
  notes?: string;

  @ApiProperty({
    description: 'Assigned primary collector for this relationship (Sticky Assignment)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    required: false,
  })
  @Column({
    name: 'primary_collector_id',
    type: 'uuid',
    nullable: true,
    comment: 'Assigned primary collector for this relationship (Sticky Assignment)',
  })
  @Index('idx_debtor_profile_collector')
  primaryCollectorId?: string;

  // Relationships (all org-scoped)
  @ApiProperty({
    description: 'Debtor addresses (organization-specific)',
    type: () => [DebtorAddress],
    isArray: true,
  })
  @OneToMany(() => DebtorAddress, (address) => address.debtorProfile, {
    cascade: true,
    eager: false,
  })
  addresses: DebtorAddress[];

  @ApiProperty({
    description: 'Debtor email addresses (organization-specific)',
    type: () => [DebtorEmail],
    isArray: true,
  })
  @OneToMany(() => DebtorEmail, (email) => email.debtorProfile, {
    cascade: true,
    eager: false,
  })
  emails: DebtorEmail[];

  @ApiProperty({
    description: 'Debtor phone numbers (organization-specific)',
    type: () => [DebtorPhone],
    isArray: true,
  })
  @OneToMany(() => DebtorPhone, (phone) => phone.debtorProfile, {
    cascade: true,
    eager: false,
  })
  phones: DebtorPhone[];

  // Audit timestamps
  @ApiProperty({
    description: 'Timestamp when debtor profile was created',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of debtor profile creation',
  })
  @Index()
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when debtor profile was last updated',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of last debtor profile update',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Timestamp when debtor profile was soft deleted',
    example: '2024-01-20T15:45:00Z',
    format: 'date-time',
    required: false,
  })
  @Column({
    name: 'deleted_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Soft delete timestamp - null if profile is active',
  })
  @Index()
  deletedAt?: Date;
}
