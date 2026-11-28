import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ActionType } from '@verichron/enums';

/**
 * Collector Action Entity
 *
 * Stores all collector actions for analytics and reporting.
 * This provides a queryable local data source for calculating
 * collector performance metrics.
 */
@Entity('collector_actions')
@Index(['organizationId', 'collectorUserId', 'actionDate'])
@Index(['organizationId', 'debtorProfileId'])
@Index(['actionType', 'actionDate'])
export class CollectorAction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  @Index()
  organizationId!: string;

  @Column({ type: 'uuid', name: 'collector_user_id' })
  @Index()
  collectorUserId!: string;

  @Column({ type: 'uuid', name: 'debtor_profile_id' })
  debtorProfileId!: string;

  @Column({
    type: 'enum',
    enum: ActionType,
    name: 'action_type',
  })
  actionType!: ActionType;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'text', nullable: true })
  outcome?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata?: Record<string, any>;

  @Column({ type: 'timestamp', name: 'action_date' })
  @Index()
  actionDate!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
