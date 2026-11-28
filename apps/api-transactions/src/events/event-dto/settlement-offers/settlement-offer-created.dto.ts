import { SettlementOfferCreatedPayload } from '@verichron/events';
import { IsUUID, IsString, IsNumber, IsDateString, IsEnum, IsOptional } from 'class-validator';

export class SettlementOfferCreatedDto implements SettlementOfferCreatedPayload {
  @IsUUID()
  settlementOfferId: string;

  @IsUUID()
  debtId: string;

  @IsUUID()
  organizationId: string;

  @IsEnum(['CREDITOR', 'DEBTOR'])
  offeredBy: 'CREDITOR' | 'DEBTOR';

  @IsNumber()
  originalBalance: number;

  @IsNumber()
  settlementAmount: number;

  @IsNumber()
  settlementPercentage: number;

  @IsEnum(['LUMP_SUM', 'INSTALLMENT'])
  paymentStructure: 'LUMP_SUM' | 'INSTALLMENT';

  @IsDateString()
  offerDate: string;

  @IsOptional()
  @IsDateString()
  expirationDate: string | null;

  @IsDateString()
  createdAt: string;
}
