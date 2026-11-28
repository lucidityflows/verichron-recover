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

  @IsString()
  @IsNotEmpty()
  targetEntityId: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  error?: string;

  @IsArray()
  @IsString({ each: true })
  notificationsSent: string[];

  @IsString()
  @IsOptional()
  correlationId?: string;
}
