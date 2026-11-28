import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
  OneToOne,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalScope, GoalType, GoalPeriod, GoalUnit } from '@verichron/enums';
import { IGoal } from '@verichron/contracts';
import { GoalProgress } from './goal-progress.entity';

/**
 * Goal Entity
 *
 * Defines performance targets for collectors or teams.
 * Co-located in api-collectors to facilitate real-time performance tracking.
 */
@Entity({ name: 'goals' })
@Index(['organizationId', 'isActive'])
@Unique(['organizationId', 'name'])
export class Goal implements IGoal {
  @ApiProperty({
    description: 'Unique goal identifier',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    format: 'uuid',
  })
  @Column({ name: 'organization_id', type: 'uuid' })
  @Index()
  organizationId: string;

  @ApiProperty({
    description: 'The scope of the goal (individual or team)',
    enum: GoalScope,
    enumName: 'GoalScope',
  })
  @Column({
    type: 'varchar',
    length: 20,
    enum: GoalScope,
  })
  scope: GoalScope;

  @ApiPropertyOptional({
    description: 'Team ID (if scope is TEAM)',
    format: 'uuid',
  })
  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  @Index()
  teamId?: string;

  @ApiPropertyOptional({
    description: 'Collector User ID (if scope is INDIVIDUAL)',
    format: 'uuid',
  })
  @Column({ name: 'collector_user_id', type: 'uuid', nullable: true })
  @Index()
  collectorUserId?: string;

  @ApiProperty({
    description: 'The type of metric being tracked',
    enum: GoalType,
    enumName: 'GoalType',
  })
  @Column({
    type: 'varchar',
    length: 20,
    enum: GoalType,
  })
  type: GoalType;

  @ApiProperty({
    description: 'The period for the goal',
    enum: GoalPeriod,
    enumName: 'GoalPeriod',
  })
  @Column({
    type: 'varchar',
    length: 20,
    enum: GoalPeriod,
  })
  period: GoalPeriod;

  @ApiProperty({
    description: 'The target value to reach',
    example: 5000.0,
  })
  @Column({ name: 'target_value', type: 'decimal', precision: 12, scale: 2 })
  targetValue: number;

  @ApiProperty({
    description: 'The unit of the target value',
    enum: GoalUnit,
    enumName: 'GoalUnit',
  })
  @Column({
    type: 'varchar',
    length: 50,
    enum: GoalUnit,
  })
  unit: GoalUnit;

  @ApiProperty({
    description: 'Name of the goal',
    example: 'Monthly Revenue Goal',
  })
  @Column({ length: 255 })
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the goal',
  })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({
    description: 'Start date of the goal',
    format: 'date-time',
  })
  @Column({ name: 'start_date', type: 'timestamp' })
  startDate: Date;

  @ApiPropertyOptional({
    description: 'End date of the goal',
    format: 'date-time',
  })
  @Column({ name: 'end_date', type: 'timestamp', nullable: true })
  endDate?: Date;

  @ApiProperty({
    description: 'Whether the goal is currently active',
    default: true,
  })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the goal has been archived',
    default: false,
  })
  @Column({ name: 'is_archived', type: 'boolean', default: false })
  isArchived: boolean;

  @ApiProperty({
    description: 'User ID of the creator',
    format: 'uuid',
  })
  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToOne(() => GoalProgress, (progress) => progress.goal, { cascade: true })
  progress: GoalProgress;
}
