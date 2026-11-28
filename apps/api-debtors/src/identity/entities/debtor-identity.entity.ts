import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';

/**
 * DebtorIdentity Entity
 *
 * Represents the global identity of a unique real-world person.
 * This is the "golden record" for an individual, regardless of how many
 * organizations they are associated with as a debtor.
 *
 * Key Characteristics:
 * - ONE identity per unique person
 * - Can optionally link to a registered User account (via userId)
 * - Has a one-to-many relationship with DebtorProfile
 * - Organization-agnostic (identity transcends organizations)
 *
 * Example:
 * Diana Prince has:
 * - ONE DebtorIdentity (represents Diana as a unique person)
 * - ONE User account (if she registers)
 * - TWO DebtorProfiles (one for Stark Industries, one for Wayne Enterprises)
 */
@Entity('debtor_identities')
export class DebtorIdentityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Optional link to a registered user account.
   *
   * - Nullable: Most debtors are not registered users
   * - Unique: A user can only be linked to ONE identity
   * - When a debtor registers, this field is populated
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true, unique: true })
  @Index('idx_debtor_identity_user_id')
  userId: string | null;

  /**
   * Debtor profiles associated with this identity.
   * One profile per organization the person is a debtor in.
   */
  @OneToMany('DebtorProfileEntity', (profile: any) => profile.debtorIdentity)
  profiles: DebtorProfileEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
