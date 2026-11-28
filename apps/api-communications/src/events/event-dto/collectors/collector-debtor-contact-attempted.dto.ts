import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import type { CollectorDebtorContactAttemptedPayload } from '@verichron/events';
import { ActionType } from '@verichron/enums';

export class CollectorDebtorContactAttemptedDto implements CollectorDebtorContactAttemptedPayload
{
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
  outcome: string;

  @IsISO8601()
  @IsNotEmpty()
  contactDate: string;

  @IsISO8601()
  @IsNotEmpty()
  attemptedAt: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsISO8601()
  @IsOptional()
  nextActionDue?: string;
}
