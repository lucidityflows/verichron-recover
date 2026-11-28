import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationStatus, OrganizationType } from '@verichron/enums';
import type { OrganizationAddress } from './organization-address.entity';
import type { OrganizationEmail } from './organization-email.entity';
import type { OrganizationPhoneNumber } from './organization-phone-number.entity';

/**
 * Organization entity representing a tenant in the SaaS platform
 * Can be a debt collection agency, creditor, or partner organization
 */
@Entity('organizations')
@Index(['name'])
@Index(['organizationType'])
@Index(['status'])
@Index(['parentOrganizationId'])
export class Organization {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id!: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'display_name' })
  displayName?: string;

  @Column({
    type: 'enum',
    enum: OrganizationType,
    name: 'organization_type',
  })
  organizationType!: OrganizationType;

  @Column({ type: 'uuid', nullable: true, name: 'parent_organization_id' })
  parentOrganizationId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'tax_id' })
  taxId?: string;

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.PROVISIONING,
    name: 'status',
  })
  status!: OrganizationStatus;

  @Column({ type: 'jsonb', nullable: true, name: 'settings' })
  settings?: Record<string, any>;

  // Self-referencing relationship for hierarchy
  @ManyToOne('Organization', (org: Organization) => org.childOrganizations, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_organization_id' })
  parentOrganization?: Organization;

  @OneToMany('Organization', (org: Organization) => org.parentOrganization)
  childOrganizations?: Organization[];

  // Contact information relationships
  @OneToMany('OrganizationAddress', (address: OrganizationAddress) => address.organization, {
    cascade: true,
  })
  addresses?: OrganizationAddress[];

  @OneToMany('OrganizationEmail', (email: OrganizationEmail) => email.organization, {
    cascade: true,
  })
  emails?: OrganizationEmail[];

  @OneToMany(
    'OrganizationPhoneNumber',
    (phoneNumber: OrganizationPhoneNumber) => phoneNumber.organization,
    { cascade: true },
  )
  phoneNumbers?: OrganizationPhoneNumber[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'uuid', nullable: true, name: 'updated_by' })
  updatedBy?: string;
}
