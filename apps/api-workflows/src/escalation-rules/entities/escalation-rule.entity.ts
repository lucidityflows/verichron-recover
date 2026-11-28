import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import {
  EscalationEscalateTo,
  EscalationNotificationMethod,
  WorkflowPriority,
} from '@verichron/enums';
import { WorkflowCondition } from '@verichron/contracts'; // Reusing WorkflowCondition interface

@Entity('escalation_rules')
@Index(['organizationId', 'name'], { unique: true })
export class EscalationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true, name: 'enabled' })
  enabled: boolean;

  @Column({ type: 'jsonb', name: 'trigger_conditions' })
  triggerConditions: WorkflowCondition[]; // Reusing WorkflowCondition for trigger conditions

  @Column({
    type: 'enum',
    enum: EscalationEscalateTo,
    name: 'escalate_to',
  })
  escalateTo: EscalationEscalateTo;

  @Column({ type: 'jsonb', name: 'escalation_targets' })
  escalationTargets: string[]; // User IDs or roles to notify

  @Column({ type: 'jsonb', name: 'notification_methods' })
  notificationMethods: EscalationNotificationMethod[];

  @Column({
    type: 'enum',
    enum: WorkflowPriority,
    default: WorkflowPriority.MEDIUM,
    name: 'priority',
  })
  priority: WorkflowPriority;

  @Column({ type: 'integer', default: 24, name: 'cooldown_hours' })
  cooldownHours: number; // Cooldown period to prevent duplicate escalations (in hours)

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy?: string; // User ID

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'integer', default: 0, name: 'execution_count' })
  executionCount: number;
}
