import { AutoAssignmentCompletedPayload } from "@verichron/events";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";


export class AutoAssignmentCompletedDto implements AutoAssignmentCompletedPayload {

    @IsUUID()
    @IsNotEmpty()
    organizationId: string;

    @IsNotEmpty()
    @IsString()
    configId: string;

    @IsBoolean()
    @IsNotEmpty()
    success: boolean;

    @IsUUID()
    @IsOptional()
    collectorId?: string | undefined;
    
    @IsUUID()
    @IsNotEmpty()
    targetEntityId: string;
    
    @IsString()
    @IsOptional()
    reason?: string | undefined;
    
    @IsString()
    @IsOptional()
    error?: string | undefined;
    
    @IsString()
    @IsOptional()
    correlationId?: string | undefined;
    
}