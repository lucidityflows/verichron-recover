import { IsUUID, IsNumber, IsString, IsDateString, IsOptional } from 'class-validator';
import { TransactionSucceededPayload } from '@verichron/events';

/**
 * Event DTO for TransactionSucceeded event
 *
 * Published by api-transactions when a payment is successfully processed
 * Consumed by api-debts for balance updates and api-communications for receipts
 */
export class TransactionSucceededDto implements TransactionSucceededPayload {
  @IsUUID()
  transactionId: string;

  @IsUUID()
  organizationId: string;

  @IsOptional()
  @IsUUID()
  debtId: string | null;

  @IsOptional()
  @IsUUID()
  paymentPlanId: string | null;

  @IsOptional()
  @IsUUID()
  debtorId: string | null;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  gatewayTransactionId: string | null;

  @IsDateString()
  succeededAt: string;
}
