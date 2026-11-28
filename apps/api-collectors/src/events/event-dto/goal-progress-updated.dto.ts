import { IsEnum, IsNotEmpty, IsNumber, IsUUID, IsDate } from 'class-validator';
import { GoalStatus } from '@verichron/enums';
import { GoalProgressUpdatedPayload } from '@verichron/events';
import { Type } from 'class-transformer';

export class GoalProgressUpdatedDto implements GoalProgressUpdatedPayload {
  @IsUUID()
  @IsNotEmpty()
  goalId: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsNumber()
  @IsNotEmpty()
  currentValue: number;

  @IsNumber()
  @IsNotEmpty()
  targetValue: number;

  @IsNumber()
  @IsNotEmpty()
  progressPercentage: number;

  @IsEnum(GoalStatus)
  @IsNotEmpty()
  status: GoalStatus;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  lastUpdated: Date;
}
