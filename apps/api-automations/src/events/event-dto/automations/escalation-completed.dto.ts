import { EscalationCompletedPayload } from "@verichron/events";
import { IsNotEmpty, IsUUID, IsString, IsArray, IsEnum, IsOptional } from "class-validator";


export class EscalationCompletedDto implements EscalationCompletedPayload {

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

    @IsString()
    @IsNotEmpty()
    escalatedTo: string;

    @IsArray()
    escalationTargets: string[];

    @IsString() // should this be an enum?
    priority: string;

    @IsArray()
    @IsString({ each: true })
    notificationsSent: string[];

    @IsString()
    @IsOptional()
    correlationId?: string | undefined;

}