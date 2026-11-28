import { SettlementOfferCompletedPayload } from '@verichron/events';
import { IsUUID, IsNumber, IsDateString } from 'class-validator';

export class SettlementOfferCompletedDto implements SettlementOfferCompletedPayload {
  @IsUUID()
  settlementOfferId: string;

  @IsUUID()
  debtId: string;

  @IsUUID()
  organizationId: string;

  @IsNumber()
  settlementAmount: number;

  @IsDateString()
  completionDate: string;

  @IsDateString()
  completedAt: string;
}
