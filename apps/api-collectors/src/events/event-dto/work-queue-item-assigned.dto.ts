import { WorkQueueItemAssignedPayload } from "@verichron/events";
import { IsIn, IsNotEmpty, IsString, IsUUID } from "class-validator";

export class WorkQueueItemAssignedDto implements WorkQueueItemAssignedPayload {
    @IsUUID()
    @IsNotEmpty()
    organizationId: string;

    @IsUUID()
    @IsNotEmpty()
    collectorId: string;

    @IsUUID()
    @IsNotEmpty()
    targetEntityId: string;

    @IsIn(['DEBTOR', 'ACCOUNT'])
    @IsNotEmpty()
    targetEntityType: 'DEBTOR' | 'ACCOUNT';

    @IsString()
    @IsNotEmpty()
    assignedBy: string;

    @IsString()
    @IsNotEmpty()
    assignmentReason: string;
}
