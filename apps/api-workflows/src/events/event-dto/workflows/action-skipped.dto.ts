import { WorkflowActionSkippedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsOptional } from 'class-validator';

export class WorkflowActionSkippedDto implements WorkflowActionSkippedPayload {
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
  actionType: string;

  @IsString()
  @IsNotEmpty()
  targetEntityId: string;

  @IsString()
  @IsNotEmpty()
  targetEntityType: string;

  @IsString()
  @IsNotEmpty()
  skipReason: string;

  @IsOptional()
  @IsString()
  correlationId?: string;
}
