import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import type { UserEntity } from './user.entity';
import { EmailCategory } from '@verichron/enums';

@Entity('user_emails')
export class UserEmailEntity {
  @ApiProperty({ description: 'The unique identifier for the email record.', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @ApiProperty({ description: 'The ID of the user this email belongs to.', format: 'uuid' })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ApiProperty({ description: 'The email address.', example: 'john.doe@work.com' })
  @Column({ name: 'email', type: 'varchar', length: 255 })
  email: string;

  @ApiProperty({ description: 'Indicates if this is the user\'s primary email address.', default: false })
  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary: boolean;

  @ApiProperty({ enum: EmailCategory, description: 'The category of the email.', example: EmailCategory.GENERAL })
  @Column({ name: 'email_category', type: 'enum', enum: EmailCategory, default: EmailCategory.GENERAL })
  emailCategory: EmailCategory;

  @ApiProperty({ description: 'The timestamp when the email record was created.' })
  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'The timestamp when the email record was last updated.' })
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne('UserEntity', (user: UserEntity) => user.emails)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;
}
