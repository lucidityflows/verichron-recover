import { IsString, IsNumber, IsNotEmpty, IsUUID, IsISO8601, IsOptional } from 'class-validator';
import type { TransactionRefundIssuedPayload } from '@verichron/events';

export class TransactionRefundIssuedDto implements TransactionRefundIssuedPayload {
  
  @IsString()
  @IsNotEmpty()
  refundTransactionId: string;
  
  @IsUUID()
  @IsOptional()
  debtId: string | null;
  
  @IsString()
  reason: string;
  
  @IsString()
  @IsNotEmpty()
  gatewayRefundId: string;
  
  @IsISO8601()
  @IsNotEmpty()
  issuedAt: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @IsUUID()
  @IsNotEmpty()
  refundId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsUUID()
  @IsNotEmpty()
  originalTransactionId: string;
}
