import { EscalateToManagerPayload } from '@verichron/events';
import { WorkflowPriority } from '@verichron/enums';
import { IsNotEmpty, IsUUID, IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class EscalateToManagerDto implements EscalateToManagerPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  managerId: string;

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsEnum(['DEBTOR', 'DEBT'])
  targetEntityType: 'DEBTOR' | 'DEBT';

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsEnum(WorkflowPriority)
  priority: WorkflowPriority;

  @IsOptional()
  @IsObject()
  escalationDetails?: Record<string, any>;
}
