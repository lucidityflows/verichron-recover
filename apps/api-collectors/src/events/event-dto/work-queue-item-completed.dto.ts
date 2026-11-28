import { ResolutionType } from "@verichron/enums";
import { WorkQueueItemCompletedPayload } from "@verichron/events";
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class WorkQueueItemCompletedDto implements WorkQueueItemCompletedPayload {
    @IsUUID()
    @IsNotEmpty()
    organizationId: string;

    @IsUUID()
    @IsNotEmpty()
    workQueueItemId: string;

    @IsUUID()
    @IsNotEmpty()
    debtorId: string;

    @IsUUID()
    @IsNotEmpty()
    collectorUserId: string;

    @IsISO8601()
    @IsNotEmpty()
    completedAt: string;

    @IsEnum(ResolutionType)
    @IsNotEmpty()
    resolutionType: ResolutionType;

    @IsString()
    @IsOptional()
    outcome?: string;
}
