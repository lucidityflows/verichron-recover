import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('audit_archives')
@Index(['organizationId', 'rangeStart', 'rangeEnd'], { unique: true })
export class AuditArchive {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId!: string;

  @Column({ type: 'timestamptz', name: 'range_start' })
  rangeStart!: Date;

  @Column({ type: 'timestamptz', name: 'range_end' })
  rangeEnd!: Date;

  @Column({ type: 'varchar', length: 512, name: 'object_key' })
  objectKey!: string;

  @Column({ type: 'int', name: 'record_count' })
  recordCount!: number;

  @Column({ type: 'varchar', length: 128, name: 'checksum' })
  checksum!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
