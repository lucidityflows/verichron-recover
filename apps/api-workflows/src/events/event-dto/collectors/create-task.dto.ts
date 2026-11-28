import { CreateTaskPayload } from '@verichron/events';
import { ActionType, WorkflowPriority } from '@verichron/enums';
import { IsNotEmpty, IsUUID, IsString, IsEnum, IsOptional, IsObject, IsDateString } from 'class-validator';

export class CreateTaskDto implements CreateTaskPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  assigneeId: string;

  @IsEnum(ActionType)
  taskType: ActionType;

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsEnum(['DEBTOR', 'DEBT'])
  targetEntityType: 'DEBTOR' | 'DEBT';

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @IsEnum(WorkflowPriority)
  priority: WorkflowPriority;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
