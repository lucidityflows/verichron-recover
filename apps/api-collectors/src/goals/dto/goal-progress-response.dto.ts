import { ApiProperty } from '@nestjs/swagger';
import { IGoalProgressResponse } from '@verichron/contracts';
import { GoalStatus } from '@verichron/enums';

export class GoalProgressResponseDto implements IGoalProgressResponse {
  @ApiProperty({
    description: 'Unique identifier of the goal',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    format: 'uuid',
  })
  goalId: string;

  @ApiProperty({
    description: 'Current accumulated value',
    example: 7500.00,
    type: Number,
  })
  currentValue: number;

  @ApiProperty({
    description: 'Target value',
    example: 10000.00,
    type: Number,
  })
  targetValue: number;

  @ApiProperty({
    description: 'Percentage of completion (0-100+)',
    example: 75.0,
    type: Number,
  })
  progressPercentage: number;

  @ApiProperty({
    description: 'Current status of the goal',
    enum: GoalStatus,
    enumName: 'GoalStatus',
    example: GoalStatus.ON_TRACK,
  })
  status: string;

  @ApiProperty({
    description: 'Timestamp of the last update',
    example: '2025-01-15T14:30:00Z',
    type: Date,
  })
  lastUpdated: Date;

  constructor(partial: Partial<GoalProgressResponseDto>) {
    Object.assign(this, partial);
  }
}