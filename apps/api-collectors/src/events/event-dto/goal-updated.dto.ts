import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsDate, IsBoolean } from 'class-validator';
import { GoalScope, GoalType, GoalPeriod, GoalUnit } from '@verichron/enums';
import { GoalUpdatedPayload } from '@verichron/events';
import { Type } from 'class-transformer';

export class GoalUpdatedDto implements GoalUpdatedPayload {
  @IsUUID()
  @IsNotEmpty()
  goalId: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsEnum(GoalScope)
  @IsOptional()
  scope?: GoalScope;

  @IsEnum(GoalType)
  @IsOptional()
  type?: GoalType;

  @IsEnum(GoalPeriod)
  @IsOptional()
  period?: GoalPeriod;

  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @IsEnum(GoalUnit)
  @IsOptional()
  unit?: GoalUnit;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsUUID()
  @IsNotEmpty()
  updatedBy: string;
}
