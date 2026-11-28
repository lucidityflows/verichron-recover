import { SettlementOfferAcceptedPayload } from '@verichron/events';
import { IsUUID, IsString, IsNumber, IsDateString, IsEnum } from 'class-validator';

export class SettlementOfferAcceptedDto implements SettlementOfferAcceptedPayload {
  @IsUUID()
  settlementOfferId: string;

  @IsUUID()
  debtId: string;

  @IsUUID()
  organizationId: string;

  @IsNumber()
  settlementAmount: number;

  @IsEnum(['LUMP_SUM', 'INSTALLMENT'])
  paymentStructure: 'LUMP_SUM' | 'INSTALLMENT';

  @IsString()
  resolvedBy: string;

  @IsDateString()
  resolutionDate: string;

  @IsDateString()
  acceptedAt: string;
}
