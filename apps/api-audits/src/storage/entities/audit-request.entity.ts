import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import type { IActorSnapshot } from '@verichron/contracts';

export type AuditRequestStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

@Entity('audit_requests')
@Index(['organizationId', 'createdAt'])
@Index(['organizationId', 'status'])
export class AuditRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'varchar', length: 64, name: 'request_type' })
  requestType!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: AuditRequestStatus;

  @Column({ type: 'jsonb', nullable: true })
  filters?: Record<string, any>;

  @Column({ type: 'varchar', length: 16, default: 'JSON' })
  format!: string;

  @Column({ type: 'jsonb', name: 'requested_by' })
  requestedBy!: IActorSnapshot;

  @Column({ type: 'int', nullable: true, name: 'record_count' })
  recordCount?: number;

  @Column({ type: 'text', nullable: true, name: 'artifact_url' })
  artifactUrl?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'artifact_checksum' })
  artifactChecksum?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'artifact_mime_type' })
  artifactMimeType?: string | null;

  @Column({ type: 'int', nullable: true, name: 'artifact_size_bytes' })
  artifactSizeBytes?: number | null;

  @Column({ type: 'jsonb', nullable: true, name: 'artifact_data' })
  artifactData?: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  errorMessage?: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt?: Date | null;

  @Column({ type: 'int', name: 'retry_count', default: 0 })
  retryCount!: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt?: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
