import { ExecuteAutoAssignmentPayload } from '@verichron/events';
import type { AutoAssignmentFilters } from '@verichron/contracts';
import { IsNotEmpty, IsUUID, IsString, IsArray, IsOptional, IsNumber, IsObject } from 'class-validator';

export class ExecuteAutoAssignmentDto implements ExecuteAutoAssignmentPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  configId: string;

  @IsString()
  @IsNotEmpty()
  configName: string;

  @IsString()
  @IsNotEmpty()
  strategy: string;

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

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsString()
  @IsNotEmpty()
  targetEntityType: string;

  @IsOptional()
  @IsObject()
  targetEntityData?: Record<string, any>;

  @IsOptional()
  @IsString()
  correlationId?: string;
}
