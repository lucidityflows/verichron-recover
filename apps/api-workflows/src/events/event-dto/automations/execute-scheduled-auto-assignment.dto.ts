import { ExecuteScheduledAutoAssignmentPayload } from '@verichron/events';
import type { AutoAssignmentFilters } from '@verichron/contracts';
import { AutoAssignmentStrategy } from '@verichron/enums';
import { IsNotEmpty, IsUUID, IsString, IsArray, IsOptional, IsNumber, IsObject, IsEnum } from 'class-validator';

export class ExecuteScheduledAutoAssignmentDto implements ExecuteScheduledAutoAssignmentPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  configId: string;

  @IsString()
  @IsNotEmpty()
  configName: string;

  @IsEnum(AutoAssignmentStrategy)
  strategy: AutoAssignmentStrategy;

  @IsArray()
  @IsString({ each: true })
  collectorPool: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeCollectors?: string[];

  @IsOptional()
  @IsNumber()
  maxAssignmentsPerDay?: number;

  @IsOptional()
  @IsNumber()
  workloadThreshold?: number;

  @IsOptional()
  @IsString()
  lastAssignedCollectorId?: string;

  @IsOptional()
  @IsObject()
  dailyAssignmentCounts?: Record<string, Record<string, number>>;

  @IsOptional()
  @IsObject()
  filters?: AutoAssignmentFilters;
}
