import { WorkflowCondition } from "@verichron/contracts";
import { ExecuteEscalationPayload } from "@verichron/events";
import { IsUUID, IsString, IsNotEmpty, IsOptional, IsArray } from "class-validator";


export class ExecuteEscalationDto implements ExecuteEscalationPayload {

    @IsUUID()
    @IsNotEmpty()
    organizationId: string;

    @IsString()
    @IsNotEmpty()
    ruleId: string;

    @IsString()
    @IsNotEmpty()
    ruleName: string;

    @IsString()
    @IsNotEmpty()
    targetEntityId: string;

    @IsString()
    @IsNotEmpty()
    targetEntityType: string;

    @IsOptional()
    targetEntityData?: Record<string, any> | undefined;

    @IsArray()
    triggerConditions: WorkflowCondition[];

    @IsNotEmpty()
    @IsString()
    escalateTo: string;

    @IsArray()
    escalationTargets: string[];

    @IsArray()
    notificationMethods: string[];

    @IsString()
    @IsNotEmpty()
    priority: string; // should this be an enum

    @IsString()
    @IsOptional()
    correlationId?: string | undefined;

    
}