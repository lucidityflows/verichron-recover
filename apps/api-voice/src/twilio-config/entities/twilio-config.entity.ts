import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('twilio_configs')
export class TwilioConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'organization_id' })
  organizationId: string;

  @Column({ type: 'varchar', length: 255, name: 'account_sid' })
  accountSid: string;

  @Column({
    type: 'varchar',
    length: 512, // Allow ample space for encrypted value
    name: 'auth_token',
    comment: 'This value is encrypted at rest',
  })
  authToken: string;

  @Column({ type: 'varchar', length: 255, name: 'api_key_sid' })
  apiKeySid: string;

  @Column({
    type: 'varchar',
    length: 512, // Allow ample space for encrypted value
    name: 'api_key_secret',
    comment: 'This value is encrypted at rest',
  })
  apiKeySecret: string;

  @Column({ type: 'varchar', length: 255, name: 'outgoing_application_sid' })
  outgoingApplicationSid: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
