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
import { AddressCategory } from '@verichron/enums';
import type { DebtorProfileEntity } from './debtor-profile.entity';

/**
 * Debtor Address Entity
 *
 * Represents a physical address associated with a debtor.
 * Debtors can have multiple addresses (current, previous, mailing, etc.)
 */
@Entity('debtor_addresses')
@Index(['debtorProfileId', 'addressCategory'])
export class DebtorAddress {
  @ApiProperty({
    description: 'Unique address identifier',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid', {
    name: 'id',
    comment: 'Primary key - unique address identifier',
  })
  id: string;

  @ApiProperty({
    description: 'Debtor Profile ID this address belongs to',
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
    description: 'Address category/type',
    example: AddressCategory.RESIDENCE_PRIMARY,
    enum: AddressCategory,
  })
  @Column({
    name: 'address_category',
    type: 'enum',
    enum: AddressCategory,
    default: AddressCategory.RESIDENCE_PRIMARY,
    comment: 'Type/category of address',
  })
  @Index()
  addressCategory: AddressCategory;

  @ApiProperty({
    description: 'Street address line 1',
    example: '123 Main Street',
    maxLength: 255,
  })
  @Column({
    name: 'street1',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Street address line 1',
  })
  street1: string;

  @ApiPropertyOptional({
    description: 'Street address line 2 (apartment, suite, etc.)',
    example: 'Apt 4B',
    maxLength: 255,
  })
  @Column({
    name: 'street2',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Street address line 2 (optional)',
  })
  street2?: string;

  @ApiPropertyOptional({
    description: 'Street address line 3',
    maxLength: 255,
  })
  @Column({
    name: 'street3',
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: 'Street address line 3 (optional)',
  })
  street3?: string;

  @ApiProperty({
    description: 'City',
    example: 'Springfield',
    maxLength: 100,
  })
  @Column({
    name: 'city',
    type: 'varchar',
    length: 100,
    nullable: false,
    comment: 'City name',
  })
  city: string;

  @ApiProperty({
    description: 'State or province',
    example: 'IL',
    maxLength: 50,
  })
  @Column({
    name: 'state',
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'State or province',
  })
  state: string;

  @ApiProperty({
    description: 'ZIP or postal code',
    example: '62701',
    maxLength: 10,
  })
  @Column({
    name: 'postal_code',
    type: 'varchar',
    length: 10,
    nullable: false,
    comment: 'ZIP or postal code',
  })
  @Index()
  postalCode: string;

  @ApiPropertyOptional({
    description: 'Country (defaults to US)',
    example: 'US',
    maxLength: 100,
    default: 'US',
  })
  @Column({
    name: 'country',
    type: 'varchar',
    length: 100,
    default: 'US',
    comment: 'Country name',
  })
  country: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 39.7817213,
  })
  @Column({
    name: 'latitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    comment: 'Latitude coordinate',
  })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: -89.6501481,
  })
  @Column({
    name: 'longitude',
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    comment: 'Longitude coordinate',
  })
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Whether this address has been verified',
    example: false,
    default: false,
  })
  @Column({
    name: 'is_verified',
    type: 'boolean',
    default: false,
    comment: 'Flag indicating if address has been verified via skip tracing',
  })
  isVerified: boolean;

  @ApiPropertyOptional({
    description: 'Date address was last verified',
    example: '2024-01-15',
    format: 'date',
  })
  @Column({
    name: 'verified_at',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp of last address verification',
  })
  verifiedAt?: Date;

  @ApiPropertyOptional({
    description: 'Whether this is the current/active address',
    example: true,
    default: true,
  })
  @Column({
    name: 'is_current',
    type: 'boolean',
    default: true,
    comment: 'Flag indicating if this is the current address',
  })
  @Index()
  isCurrent: boolean;

  @ApiPropertyOptional({
    description: 'Whether this is the primary address for the debtor',
    example: true,
    default: false,
  })
  @Column({
    name: 'is_primary',
    type: 'boolean',
    default: false,
    comment: 'Flag indicating if this is the primary address',
  })
  @Index()
  isPrimary: boolean;

  // Relationship
  @ManyToOne('DebtorProfileEntity', (debtorProfile: any) => debtorProfile.addresses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'debtor_profile_id' })
  debtorProfile: DebtorProfileEntity;

  // Audit timestamps
  @ApiProperty({
    description: 'Timestamp when address was created',
    example: '2024-01-01T00:00:00Z',
    format: 'date-time',
  })
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of address creation',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when address was last updated',
    example: '2024-01-15T10:30:00Z',
    format: 'date-time',
  })
  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamp with time zone',
    comment: 'Timestamp of last address update',
  })
  updatedAt: Date;
}
