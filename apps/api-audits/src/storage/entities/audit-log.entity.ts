import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { IActorSnapshot, IChangeDelta, IAuditLog } from '@verichron/contracts';

/**
 * Audit Log Entity
 * 
 * Represents a single immutable record of an action in the system.
 * Designed for high-volume ingestion and compliance reporting.
 * 
 * STORAGE STRATEGY:
 * - Hot Storage: PostgreSQL (Partitioned by Month)
 * - Cold Storage: GCS Parquet (Archived after 90 days)
 * 
 * This entity maps to the partitioned PostgreSQL table.
 */
@Entity('audit_logs')
@Index(['organizationId', 'createdAt']) // Time-based queries per tenant
@Index(['organizationId', 'targetId'])  // Entity history queries
@Index(['eventId'], { unique: true })   // Idempotency + event lookup
export class AuditLog implements IAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'uuid', name: 'event_id' })
  eventId!: string;

  /**
   * "Ghost User" Protection
   * Stores a complete snapshot of the actor at the time of the event.
   */
  @Column({ type: 'jsonb', name: 'actor_snapshot' })
  actorSnapshot!: IActorSnapshot;

  @Column({ type: 'varchar', length: 64 })
  action!: string;

  @Column({ type: 'varchar', length: 32, name: 'target_type' })
  targetType!: string;

  @Column({ type: 'varchar', length: 64, name: 'target_id' })
  targetId!: string;

  /**
   * "Storage Bloat" Protection
   * Stores only the delta of changes, not the full payload.
   */
  @Column({ type: 'jsonb', nullable: true })
  changes?: Record<string, IChangeDelta>;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * Tamper-Proofing
   * Cryptographic hash of the previous record in the chain.
   */
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'prev_hash' })
  prevHash?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
