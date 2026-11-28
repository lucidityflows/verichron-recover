import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * GlobalCreditor Entity
 *
 * Platform-owned master creditor registry. Contains verified, canonical
 * representations of creditors that can be linked by organization-owned
 * creditor records. Used for semantic entity resolution during import.
 *
 * **Architecture Decision:** Separated from org-owned `creditors` table to
 * prevent cross-tenant data pollution and enable platform-level intelligence.
 *
 * @see APPROVED-VERTEX-AI-IMPORT-STRATEGY.md
 */
@Entity('global_creditors')
export class GlobalCreditor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * The canonical, verified name of the creditor.
   * Example: "JPMorgan Chase N.A." (not "JPM" or "Chase Bank")
   */
  @Column({ unique: true, name: 'canonical_name' })
  canonicalName: string;

  /**
   * Verified EIN (Employer Identification Number).
   * Used for exact matching during import resolution.
   * UNIQUE constraint enforces one global record per EIN.
   */
  @Column({ unique: true, nullable: true, name: 'verified_ein' })
  verifiedEIN: string;

  /**
   * Known aliases for fuzzy matching.
   * Example: ["JPM", "Chase Bank", "Chase Manhattan"]
   */
  @Column({ type: 'text', array: true, default: '{}', name: 'known_aliases' })
  knownAliases: string[];

  /**
   * TRUE for Gold List entries (Static seed data, not org-created).
   * FALSE for creditors created via cross-tenant learning (Phase 2).
   */
  @Column({ type: 'boolean', default: true, name: 'is_reference_only' })
  isReferenceOnly: boolean;

  /**
   * Industry classification for analytics.
   * Example: "Banking", "Healthcare", "Telecommunications"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  industry: string;

  /**
   * Platform admin user who created this global creditor.
   * NULL for seed data entries.
   */
  @Column({ nullable: true, name: 'created_by_platform_user_id' })
  createdByPlatformUserId: string;

  /**
   * Extensible metadata for future use.
   * Example: { sourceUrl: "https://...", notes: "...", ... }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    sourceUrl?: string;
    notes?: string;
    [key: string]: any;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
