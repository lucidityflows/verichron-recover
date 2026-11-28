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
import { PhoneCategory } from '@verichron/enums';
import type { Organization } from './organization.entity';

/**
 * Organization phone number entity
 * Supports multiple phone numbers per organization with different purposes
 */
@Entity('organization_phone_numbers')
@Index(['organizationId'])
@Index(['organizationId', 'isPrimary'])
@Index(['phoneNumber'])
export class OrganizationPhoneNumber {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 20, name: 'phone_number' })
  phoneNumber!: string;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'extension' })
  extension?: string;

  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  isPrimary!: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_verified' })
  isVerified!: boolean;

  @Column({
    type: 'enum',
    enum: PhoneCategory,
    name: 'category'
  })
  category!: PhoneCategory;

  @Column({ type: 'timestamp', nullable: true, name: 'valid_from' })
  validFrom?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'valid_to' })
  validTo?: Date;

  @ManyToOne('Organization', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
