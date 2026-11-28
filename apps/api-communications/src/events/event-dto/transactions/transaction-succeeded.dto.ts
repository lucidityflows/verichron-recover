import { IsString, IsNumber, IsOptional, IsUUID, IsISO8601, IsNotEmpty } from 'class-validator';
import type { TransactionSucceededPayload } from '@verichron/events';

/**
 * Transaction Succeeded Event DTO
 *
 * Validates incoming TRANSACTIONS_TRANSACTION_SUCCEEDED events from api-transactions
 */
export class TransactionSucceededDto implements TransactionSucceededPayload {
  @IsISO8601()
  @IsNotEmpty()
  succeededAt: string;
  
  @IsUUID()
  transactionId: string;

  @IsUUID()
  organizationId: string;

  @IsUUID()
  debtorId: string;

  @IsNumber()
  amount: number;

  @IsString()
  currency: string; // Added based on communication-events-guide.md

  @IsISO8601()
  transactionDate: string; // Aligned with communication-events-guide.md (was succeededAt)

  @IsString()
  gatewayTransactionId: string; // Kept as optional for additional context

  @IsUUID()
  @IsOptional()
  debtId: string;

  @IsUUID()
  @IsOptional()
  paymentPlanId: string;
}
