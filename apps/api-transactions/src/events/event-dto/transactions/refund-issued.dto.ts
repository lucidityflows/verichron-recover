import { IsUUID, IsNumber, IsString, IsDateString, IsOptional } from 'class-validator';
import { TransactionRefundIssuedPayload } from '@verichron/events';

/**
 * Event DTO for RefundIssued event
 *
 * Published by api-transactions when a refund is successfully processed
 * Consumed by api-debts for balance adjustments and api-communications for confirmations
 */
export class RefundIssuedDto implements TransactionRefundIssuedPayload {
  @IsUUID()
  refundTransactionId: string;

  @IsUUID()
  originalTransactionId: string;

  @IsUUID()
  organizationId: string;

  @IsOptional()
  @IsUUID()
  debtId: string | null;

  @IsOptional()
  @IsUUID()
  debtorId: string | null;

  @IsNumber()
  amount: number;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  gatewayRefundId: string | null;

  @IsDateString()
  issuedAt: string;
}
