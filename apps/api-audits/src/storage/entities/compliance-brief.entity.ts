import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_compliance_briefs')
@Index(['organizationId', 'briefDate'], { unique: true })
@Index(['organizationId', 'generatedAt'])
export class ComplianceBrief {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'date', name: 'brief_date' })
  briefDate!: string;

  @Column({ type: 'int', name: 'total_logs' })
  totalLogs!: number;

  @Column({ type: 'int', name: 'anomaly_count' })
  anomalyCount!: number;

  @Column({ type: 'int', name: 'risk_score' })
  riskScore!: number;

  @Column({ type: 'jsonb', name: 'top_actions' })
  topActions!: Array<{ action: string; count: number }>;

  @Column({ type: 'jsonb', nullable: true, name: 'summary' })
  summary?: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt!: Date;
}
