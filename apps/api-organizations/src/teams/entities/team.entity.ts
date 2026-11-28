import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('teams')
@Unique(['organizationId', 'name']) // Ensures team names are unique per organization
export class Team {
  @ApiProperty({ description: 'Unique team identifier', format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: 'Organization ID this team belongs to', format: 'uuid' })
  @Column({ type: 'uuid', name: 'organization_id' })
  @Index()
  organizationId!: string;

  @ApiProperty({ description: 'Name of the team', maxLength: 255 })
  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @ApiPropertyOptional({ description: 'Description of the team' })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiPropertyOptional({ description: 'User ID of the team manager (from api-users)', format: 'uuid' })
  @Column({ type: 'uuid', name: 'manager_user_id', nullable: true })
  @Index()
  managerUserId?: string;

  @ApiProperty({ description: 'Timestamp when the team was created' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt!: Date;

  @ApiProperty({ description: 'Timestamp when the team was last updated' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt!: Date;
}
