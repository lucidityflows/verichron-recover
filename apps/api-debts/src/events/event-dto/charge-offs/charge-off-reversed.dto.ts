import { ChargeOffReversedPayload } from '@verichron/events';
import { IsUUID, IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class ChargeOffReversedDto implements ChargeOffReversedPayload {
  @IsUUID()
  chargeOffId: string;

  @IsUUID()
  debtId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  reversalDate: string;

  @IsString()
  reversalReason: string;

  @IsOptional()
  @IsNumber()
  recoveredAmount: number | null;

  @IsDateString()
  reversedAt: string;
}
