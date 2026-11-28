import { WorkflowPriority } from '@verichron/enums/dist';
import { UpdatePriorityPayload } from '@verichron/events';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdatePriorityDto implements UpdatePriorityPayload {

    @IsUUID()
    @IsString()
    organizationId: string;

    @IsUUID()
    @IsString()
    targetEntityId: string;

    @IsString()
    @IsNotEmpty()
    targetEntityType: 'DEBTOR' | 'DEBT';

    @IsEnum(WorkflowPriority)
    @IsNotEmpty()
    newPriority: WorkflowPriority;

    @IsString()
    @IsOptional()
    reason?: string | undefined;

}