import { UpdatePriorityPayload } from '@verichron/events';
import { WorkflowPriority } from '@verichron/enums';
import { IsNotEmpty, IsUUID, IsString, IsEnum, IsOptional } from 'class-validator';

export class UpdatePriorityDto implements UpdatePriorityPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsEnum(['DEBTOR', 'DEBT'])
  targetEntityType: 'DEBTOR' | 'DEBT';

  @IsEnum(WorkflowPriority)
  newPriority: WorkflowPriority;

  @IsOptional()
  @IsString()
  reason?: string;
}
