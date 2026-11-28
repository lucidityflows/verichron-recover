import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IGoalProgress } from '@verichron/contracts';
import { Goal } from './goal.entity';

/**
 * Goal Progress Entity
 *
 * Acts as a high-performance accumulator for real-time goal tracking.
 * Updated via event listeners to ensure O(1) read performance for dashboards.
 */
@Entity({ name: 'goal_progress' })
export class GoalProgress implements IGoalProgress {
  @ApiProperty({
    description: 'Unique progress identifier',
    format: 'uuid',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Goal ID this progress belongs to',
    format: 'uuid',
  })
  @Column({ name: 'goal_id', type: 'uuid' })
  goalId: string;

  @OneToOne(() => Goal, (goal) => goal.progress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goal_id' })
  goal: Goal;

  @ApiProperty({
    description: 'Current value reached towards the target',
    example: 1250.5,
  })
  @Column({ name: 'current_value', type: 'decimal', precision: 12, scale: 2, default: 0 })
  currentValue: number;

  @ApiProperty({
    description: 'Last time the progress was updated',
    format: 'date-time',
  })
  @UpdateDateColumn({ name: 'last_updated', type: 'timestamp' })
  lastUpdated: Date;
}
