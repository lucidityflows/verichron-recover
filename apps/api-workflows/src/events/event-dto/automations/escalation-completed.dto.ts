import { EscalationCompletedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsArray, IsOptional } from 'class-validator';

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

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsString()
  @IsNotEmpty()
  targetEntityType: string;

  @IsString()
  @IsNotEmpty()
  escalatedTo: string;

  @IsArray()
  @IsString({ each: true })
  escalationTargets: string[];

  @IsString()
  @IsNotEmpty()
  priority: string;

  @IsArray()
  @IsString({ each: true })
  notificationsSent: string[];

  @IsOptional()
  @IsString()
  correlationId?: string;
}
