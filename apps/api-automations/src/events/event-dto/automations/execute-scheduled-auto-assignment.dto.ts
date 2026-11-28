import { AutoAssignmentFilters } from "@verichron/contracts";
import { ExecuteScheduledAutoAssignmentPayload } from "@verichron/events";
import { AutoAssignmentStrategy } from "@verichron/enums";
import { IsNotEmpty, IsUUID, IsString, IsArray, IsOptional, IsNumber, IsEnum } from "class-validator";

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
    @IsNotEmpty()
    strategy: AutoAssignmentStrategy;

    @IsArray()
    collectorPool: string[];

    @IsArray()
    @IsOptional()
    excludeCollectors?: string[] | undefined;

    @IsNumber()
    @IsOptional()
    maxAssignmentsPerDay?: number | undefined;

    @IsNumber()
    @IsOptional()
    workloadThreshold?: number | undefined;

    @IsString()
    @IsOptional()
    lastAssignedCollectorId?: string | undefined;

    @IsOptional()
    dailyAssignmentCounts?: Record<string, Record<string, number>> | undefined;

    @IsOptional()
    filters?: AutoAssignmentFilters | undefined;
}
