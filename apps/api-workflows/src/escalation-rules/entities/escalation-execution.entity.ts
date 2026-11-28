import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { EscalationRule } from './escalation-rule.entity';
import { WorkflowTargetEntityType } from '@verichron/enums';

/**
 * EscalationExecution Entity
 *
 * Tracks execution history of escalation rules to implement deduplication/cooldown logic.
 * Each record represents a single escalation execution for a specific target entity.
 * Used to prevent duplicate escalations within the cooldown period defined in EscalationRule.
 */
@Entity('escalation_executions')
@Index(['organizationId', 'ruleId', 'targetEntityId', 'executedAt'])
export class EscalationExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'rule_id' })
  ruleId: string;

  @ManyToOne(() => EscalationRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rule_id' })
  rule: EscalationRule;

  @Column({ type: 'uuid', name: 'target_entity_id' })
  targetEntityId: string;

  @Column({
    type: 'enum',
    enum: WorkflowTargetEntityType,
    name: 'target_entity_type',
  })
  targetEntityType: WorkflowTargetEntityType;

  @CreateDateColumn({ type: 'timestamptz', name: 'executed_at' })
  executedAt: Date;
}
