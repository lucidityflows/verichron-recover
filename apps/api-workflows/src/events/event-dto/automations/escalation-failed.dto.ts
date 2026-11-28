import { EscalationFailedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsArray, IsOptional } from 'class-validator';

export class EscalationFailedDto implements EscalationFailedPayload {
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  ruleId: string;

  @IsString()
  @IsOptional()
  ruleName?: string;

  @IsUUID()
  @IsNotEmpty()
  targetEntityId: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsArray()
  @IsString({ each: true })
  notificationsSent: string[];

  @IsOptional()
  @IsString()
  correlationId?: string;
}
