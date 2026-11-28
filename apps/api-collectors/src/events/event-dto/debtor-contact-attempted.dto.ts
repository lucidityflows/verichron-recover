import { ActionType, CallOutcome } from "@verichron/enums";
import { DebtorContactAttemptedPayload } from "@verichron/events";
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class DebtorContactAttemptedDto implements DebtorContactAttemptedPayload {
    @IsUUID()
    @IsNotEmpty()
    debtorId: string;

    @IsUUID()
    @IsNotEmpty()
    organizationId: string;

    @IsUUID()
    @IsNotEmpty()
    collectorUserId: string;

    @IsEnum(ActionType)
    @IsNotEmpty()
    actionType: ActionType;

    @IsISO8601()
    @IsNotEmpty()
    contactDate: string;

    @IsEnum(CallOutcome)
    @IsOptional()
    outcome?: CallOutcome;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsISO8601()
    @IsOptional()
    nextActionDue?: string;

    @IsISO8601()
    @IsNotEmpty()
    attemptedAt: string;
}
