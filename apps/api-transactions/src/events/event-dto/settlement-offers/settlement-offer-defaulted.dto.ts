import { SettlementOfferDefaultedPayload } from '@verichron/events';
import { IsUUID, IsNumber, IsDateString } from 'class-validator';

export class SettlementOfferDefaultedDto implements SettlementOfferDefaultedPayload {
  @IsUUID()
  settlementOfferId: string;

  @IsUUID()
  debtId: string;

  @IsUUID()
  organizationId: string;

  @IsNumber()
  settlementAmount: number;

  @IsDateString()
  defaultedAt: string;
}
