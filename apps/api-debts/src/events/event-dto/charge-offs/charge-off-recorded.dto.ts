import { ChargeOffRecordedPayload } from '@verichron/events';
import { IsUUID, IsString, IsNumber, IsDateString } from 'class-validator';

export class ChargeOffRecordedDto implements ChargeOffRecordedPayload {
  @IsUUID()
  chargeOffId: string;

  @IsUUID()
  debtId: string;

  @IsUUID()
  organizationId: string;

  @IsDateString()
  chargeOffDate: string;

  @IsString()
  reason: string;

  @IsNumber()
  totalChargedOff: number;

  @IsNumber()
  principalChargedOff: number;

  @IsNumber()
  interestChargedOff: number;

  @IsNumber()
  feesChargedOff: number;

  @IsDateString()
  createdAt: string;
}
