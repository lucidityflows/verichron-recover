import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsISO8601, IsObject } from 'class-validator';
import { ActionType } from '@verichron/enums';
import { DebtorActionLoggedPayload } from '@verichron/events';

export class DebtorActionLoggedDto implements DebtorActionLoggedPayload {
  @IsUUID()
  @IsNotEmpty()
  actionId: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @IsUUID()
  @IsNotEmpty()
  collectorUserId: string;

  @IsEnum(ActionType)
  @IsNotEmpty()
  actionType: ActionType;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsISO8601()
  @IsNotEmpty()
  timestamp: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
