import { SettlementOfferRejectedPayload } from '@verichron/events';
import { IsUUID, IsString, IsDateString } from 'class-validator';

export class SettlementOfferRejectedDto implements SettlementOfferRejectedPayload {
  @IsUUID()
  settlementOfferId: string;

  @IsUUID()
  debtId: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  resolvedBy: string;

  @IsDateString()
  resolutionDate: string;

  @IsDateString()
  rejectedAt: string;
}
