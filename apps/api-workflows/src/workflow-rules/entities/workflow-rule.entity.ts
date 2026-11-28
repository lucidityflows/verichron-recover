import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import {
  WorkflowStatus,
  WorkflowTriggerType,
  WorkflowConditionOperator,
  WorkflowActionType,
  WorkflowPriority,
} from '@verichron/enums';
import { WorkflowCondition, WorkflowAction } from '@verichron/contracts'; // Import from contracts

@Entity('workflow_rules')
@Unique(['organizationId', 'name'])
export class WorkflowRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255, name: 'name' })
  name: string;

  @Column({ type: 'text', name: 'description', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: WorkflowTriggerType,
    name: 'trigger_type',
  })
  triggerType: WorkflowTriggerType;

  @Column({ type: 'jsonb', name: 'conditions' })
  conditions: WorkflowCondition[];

  @Column({ type: 'jsonb', name: 'actions' })
  actions: WorkflowAction[];

  @Column({
    type: 'enum',
    enum: WorkflowPriority,
    default: WorkflowPriority.MEDIUM,
    name: 'priority',
  })
  priority: WorkflowPriority;

  @Column({ type: 'boolean', default: false, name: 'enabled' })
  enabled: boolean;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy?: string; // User ID

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'integer', default: 0, name: 'execution_count' })
  executionCount: number;

  @Column({ type: 'timestamptz', name: 'last_executed_at', nullable: true })
  lastExecutedAt?: Date;
}
