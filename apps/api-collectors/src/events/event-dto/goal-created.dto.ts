import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsDate } from 'class-validator';
import { GoalScope, GoalType, GoalPeriod, GoalUnit } from '@verichron/enums';
import { GoalCreatedPayload } from '@verichron/events';
import { Type } from 'class-transformer';

export class GoalCreatedDto implements GoalCreatedPayload {
  @IsUUID()
  @IsNotEmpty()
  goalId: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsEnum(GoalScope)
  @IsNotEmpty()
  scope: GoalScope;

  @IsEnum(GoalType)
  @IsNotEmpty()
  type: GoalType;

  @IsEnum(GoalPeriod)
  @IsNotEmpty()
  period: GoalPeriod;

  @IsNumber()
  @IsNotEmpty()
  targetValue: number;

  @IsEnum(GoalUnit)
  @IsNotEmpty()
  unit: GoalUnit;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsUUID()
  @IsOptional()
  teamId?: string;

  @IsUUID()
  @IsOptional()
  collectorUserId?: string;

  @IsUUID()
  @IsNotEmpty()
  createdBy: string;
}
