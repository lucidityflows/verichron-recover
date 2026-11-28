import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CallDisposition, CallStatus } from '@verichron/enums';

@Entity('call_logs')
@Index(['organizationId', 'createdAt'])
export class CallLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'uuid', name: 'debtor_id' })
  debtorId: string;

  @Column({ type: 'uuid', name: 'agent_id' })
  agentId: string;

  @Column({ type: 'varchar', length: 255, name: 'provider_sid', unique: true })
  providerSid: string;

  @Column({ type: 'varchar', length: 20, name: 'from_number' })
  fromNumber: string;

  @Column({ type: 'varchar', length: 20, name: 'to_number' })
  toNumber: string;

  @Column({
    type: 'enum',
    enum: CallStatus,
    default: CallStatus.QUEUED,
  })
  status: CallStatus;

  @Column({ type: 'integer', nullable: true })
  duration?: number; // in seconds

  @Column({
    type: 'enum',
    enum: CallDisposition,
    nullable: true,
  })
  disposition?: CallDisposition;

  @Column({ type: 'varchar', length: 1024, name: 'recording_url', nullable: true })
  recordingUrl?: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, name: 'cost', nullable: true })
  cost?: number;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
