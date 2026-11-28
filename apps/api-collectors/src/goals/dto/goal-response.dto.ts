import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IGoal } from '@verichron/contracts';
import { GoalScope, GoalType, GoalPeriod, GoalUnit } from '@verichron/enums';

export class GoalResponseDto implements IGoal {
  @ApiProperty({
    description: 'Unique identifier of the goal',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Organization ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  organizationId: string;

  @ApiProperty({
    description: 'The scope of the goal (individual or team)',
    enum: GoalScope,
    enumName: 'GoalScope',
    example: GoalScope.INDIVIDUAL,
  })
  scope: GoalScope;

  @ApiPropertyOptional({
    description: 'Team ID (if scope is TEAM)',
    example: 'b7a3d1c2-e4f5-4a6b-8c9d-0e1f2a3b4c5d',
    format: 'uuid',
  })
  teamId?: string;

  @ApiPropertyOptional({
    description: 'Collector User ID (if scope is INDIVIDUAL)',
    example: 'c8d4e2f1-a5b6-4c7d-9e0f-1a2b3c4d5e6f',
    format: 'uuid',
  })
  collectorUserId?: string;

  @ApiProperty({
    description: 'The type of metric being tracked',
    enum: GoalType,
    enumName: 'GoalType',
    example: GoalType.COLLECTIONS,
  })
  type: GoalType;

  @ApiProperty({
    description: 'The period for the goal',
    enum: GoalPeriod,
    enumName: 'GoalPeriod',
    example: GoalPeriod.MONTHLY,
  })
  period: GoalPeriod;

  @ApiProperty({
    description: 'The target value to reach',
    example: 10000.00,
    type: Number,
  })
  targetValue: number;

  @ApiProperty({
    description: 'The unit of the target value',
    enum: GoalUnit,
    enumName: 'GoalUnit',
    example: GoalUnit.DOLLARS,
  })
  unit: GoalUnit;

  @ApiProperty({
    description: 'Name of the goal',
    example: 'January Revenue Target',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the goal',
    example: 'Collect $10k in revenue for the month of January',
  })
  description?: string;

  @ApiProperty({
    description: 'Start date of the goal',
    example: '2025-01-01T00:00:00Z',
    type: Date,
  })
  startDate: Date;

  @ApiPropertyOptional({
    description: 'End date of the goal',
    example: '2025-01-31T23:59:59Z',
    type: Date,
  })
  endDate?: Date;

  @ApiProperty({
    description: 'Whether the goal is currently active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the goal has been archived',
    example: false,
  })
  isArchived: boolean;

  @ApiProperty({
    description: 'User ID of the creator',
    example: 'd9e5f3a2-b6c7-4d8e-0f1a-2b3c4d5e6f7g',
    format: 'uuid',
  })
  createdBy: string;

  @ApiProperty({
    description: 'Timestamp when the goal was created',
    example: '2024-12-25T10:00:00Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamp when the goal was last updated',
    example: '2024-12-26T12:00:00Z',
    type: Date,
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Current accumulated value (calculated from progress)',
    example: 7500.00,
    type: Number,
  })
  currentValue: number;

  @ApiProperty({
    description: 'Percentage of completion (calculated from progress)',
    example: 75.0,
    type: Number,
  })
  progressPercentage: number;

  constructor(partial: Partial<GoalResponseDto>) {
    Object.assign(this, partial);
  }
}