import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AddressCategory } from '@verichron/enums';
import type { Organization } from './organization.entity';

/**
 * Organization address entity
 * Supports multiple addresses per organization (headquarters, billing, regional offices, etc.)
 */
@Entity('organization_addresses')
@Index(['organizationId'])
@Index(['organizationId', 'isPrimary'])
@Index(['organizationId', 'addressCategory'])
export class OrganizationAddress {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 255, name: 'street1' })
  street1!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'street2' })
  street2?: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'street3' })
  street3?: string;

  @Column({ type: 'varchar', length: 100, name: 'city' })
  city!: string;

  @Column({ type: 'varchar', length: 2, name: 'state' })
  state!: string;

  @Column({ type: 'varchar', length: 10, name: 'postal_code' })
  postalCode!: string;

  @Column({ type: 'varchar', length: 2, default: 'US', name: 'country' })
  country!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'latitude' })
  latitude?: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true, name: 'longitude' })
  longitude?: number;

  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  isPrimary!: boolean;

  @Column({
    type: 'enum',
    enum: AddressCategory,
    name: 'address_category',
  })
  addressCategory!: AddressCategory;

  @ManyToOne('Organization', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
