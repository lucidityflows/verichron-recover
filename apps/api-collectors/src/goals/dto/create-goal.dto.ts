import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  Min,
} from 'class-validator';
import { GoalScope, GoalType, GoalPeriod, GoalUnit } from '@verichron/enums';
import { ICreateGoal } from '@verichron/contracts';

export class CreateGoalDto implements ICreateGoal {
  @ApiProperty({
    enum: GoalScope,
    enumName: 'GoalScope',
    description: 'The scope of the goal (individual or team)',
  })
  @IsEnum(GoalScope)
  @IsNotEmpty()
  scope: GoalScope;

  @ApiPropertyOptional({
    description: 'Team ID (required if scope is TEAM)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  teamId?: string;

  @ApiPropertyOptional({
    description: 'Collector User ID (required if scope is INDIVIDUAL)',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  collectorUserId?: string;

  @ApiProperty({
    enum: GoalType,
    enumName: 'GoalType',
    description: 'The type of metric being tracked',
  })
  @IsEnum(GoalType)
  @IsNotEmpty()
  type: GoalType;

  @ApiProperty({
    enum: GoalPeriod,
    enumName: 'GoalPeriod',
    description: 'The period for the goal',
  })
  @IsEnum(GoalPeriod)
  @IsNotEmpty()
  period: GoalPeriod;

  @ApiProperty({
    description: 'The target value to reach',
    example: 5000.0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  targetValue: number;

  @ApiProperty({
    enum: GoalUnit,
    enumName: 'GoalUnit',
    description: 'The unit of the target value',
  })
  @IsEnum(GoalUnit)
  @IsNotEmpty()
  unit: GoalUnit;

  @ApiProperty({
    description: 'Name of the goal',
    example: 'Monthly Revenue Goal',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description of the goal',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Start date of the goal',
    example: '2025-01-01',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional({
    description: 'End date of the goal',
    example: '2025-01-31',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
