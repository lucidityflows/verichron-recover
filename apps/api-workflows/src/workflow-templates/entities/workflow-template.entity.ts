import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import {
  WorkflowPriority,
  WorkflowTriggerType,
  EscalationEscalateTo,
  EscalationNotificationMethod,
  AutoAssignmentStrategy,
} from '@verichron/enums';
import { WorkflowCondition, WorkflowAction } from '@verichron/contracts';

// This entity would typically store system-defined templates
// that users can then copy and customize into WorkflowRules.
@Entity('workflow_templates')
@Index(['category', 'isSystemTemplate'])
export class WorkflowTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, name: 'category' })
  category: 'assignment' | 'escalation' | 'compliance' | 'performance' | 'custom' | string;

  @Column({
    type: 'enum',
    enum: WorkflowTriggerType,
    name: 'trigger_type',
  })
  triggerType: WorkflowTriggerType;

  @Column({ type: 'jsonb', name: 'default_conditions', default: [] })
  defaultConditions: WorkflowCondition[];

  @Column({ type: 'jsonb', name: 'default_actions', default: [] })
  defaultActions: WorkflowAction[];

  @Column({
    type: 'enum',
    enum: WorkflowPriority,
    default: WorkflowPriority.MEDIUM,
    name: 'default_priority',
  })
  defaultPriority: WorkflowPriority;

  @Column({ type: 'boolean', default: true, name: 'is_system_template' })
  isSystemTemplate: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
