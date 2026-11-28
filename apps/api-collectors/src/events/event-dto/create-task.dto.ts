import { ActionType, WorkflowPriority } from '@verichron/enums/dist';
import { CreateTaskPayload } from '@verichron/events';
import { IsEnum, IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTaskDto implements CreateTaskPayload {

    @IsUUID()
    @IsNotEmpty()
    organizationId: string;

    @IsUUID()
    @IsNotEmpty()
    assigneeId: string;

    @IsEnum(ActionType)
    @IsNotEmpty()
    taskType: ActionType;

    @IsString()
    @IsNotEmpty()
    targetEntityId: string;

    @IsString()
    @IsNotEmpty()
    targetEntityType: 'DEBTOR' | 'DEBT';

    @IsISO8601()
    @IsNotEmpty()
    dueDate: string;

    @IsEnum(WorkflowPriority)
    @IsNotEmpty()
    priority: WorkflowPriority;

    @IsString()
    @IsOptional()
    description?: string | undefined;
    
    @IsOptional()
    metadata?: Record<string, any> | undefined;

}