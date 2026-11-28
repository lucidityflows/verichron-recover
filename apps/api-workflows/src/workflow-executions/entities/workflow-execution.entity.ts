import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { WorkflowExecutionStatus, WorkflowTargetEntityType, ActionExecutionStatus } from '@verichron/enums';

// Nested Interface for ActionExecution
export interface ActionExecution {
  actionId: string; // ID of the action in the WorkflowRule
  actionType: string; // Type of action performed
  status: ActionExecutionStatus;
  result?: string; // Short summary of the action's outcome
  error?: string; // Error message if action failed
  executedAt: Date;
  duration?: number; // milliseconds
}

@Entity('workflow_executions')
@Index(['organizationId', 'triggeredAt'])
@Index(['organizationId', 'ruleId'])
@Index(['organizationId', 'status'])
export class WorkflowExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'rule_id', nullable: true })
  ruleId?: string; // Foreign key to WorkflowRule (ON DELETE SET NULL)

  @Column({ type: 'varchar', length: 255, name: 'rule_name' })
  ruleName: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'triggered_at' })
  triggeredAt: Date;

  @Column({ type: 'varchar', length: 255, name: 'triggered_by' })
  triggeredBy: string; // 'system' | userId

  @Column({
    type: 'enum',
    enum: WorkflowTargetEntityType,
    name: 'target_entity_type',
  })
  targetEntityType: WorkflowTargetEntityType;

  @Column({ type: 'uuid', name: 'target_entity_id' })
  targetEntityId: string;

  @Column({ type: 'varchar', length: 255, name: 'target_entity_name', nullable: true })
  targetEntityName?: string;

  @Column({ type: 'jsonb', name: 'actions_executed' })
  actionsExecuted: ActionExecution[];

  @Column({
    type: 'enum',
    enum: WorkflowExecutionStatus,
    name: 'status',
  })
  status: WorkflowExecutionStatus;

  @Column({ type: 'integer', name: 'duration_ms', nullable: true })
  durationMs?: number; // milliseconds

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage?: string;

  @Column({ type: 'varchar', length: 255, name: 'correlation_id', nullable: true })
  @Index('idx_workflow_executions_correlation')
  correlationId?: string; // For idempotency checks and event tracking
}
