import { AutoAssignmentFilters } from "@verichron/contracts";
import { ExecuteAutoAssignmentPayload } from "@verichron/events";
import { IsNotEmpty, IsUUID, IsString, IsArray, IsOptional, IsNumber } from "class-validator";


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

    @IsString()
    @IsOptional()
    targetEntityId: string;
    
    @IsString()
    @IsOptional()
    targetEntityType: string;
    
    @IsOptional()
    targetEntityData?: Record<string, any> | undefined;
    
    @IsString()
    @IsOptional()
    correlationId?: string | undefined;
    
}