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
import type { Organization } from './organization.entity';
import { EmailCategory } from '@verichron/enums';


/**
 * Organization email entity
 * Supports multiple emails per organization with different purposes
 */
@Entity('organization_emails')
@Index(['organizationId'])
@Index(['organizationId', 'isPrimary'])
@Index(['email'])
export class OrganizationEmail {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 255, name: 'email' })
  email!: string;

  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  isPrimary!: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_verified' })
  isVerified!: boolean;

  @Column({
    type: 'enum',
    enum: EmailCategory,
    default: EmailCategory.GENERAL,
    name: 'email_category',
  })
  emailCategory!: EmailCategory;

  @Column({ type: 'timestamp', nullable: true, name: 'valid_from' })
  validFrom?: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'valid_to' })
  validTo?: Date;

  @ManyToOne('Organization', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
