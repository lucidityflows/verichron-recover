import { IsUUID, IsNumber, IsString, IsDateString, IsOptional } from 'class-validator';
import { TransactionFailedPayload } from '@verichron/events';

/**
 * Event DTO for TransactionFailed event
 *
 * Published by api-transactions when a payment fails to process
 * Consumed by api-communications for failure notifications and plans module for retry logic
 */
export class TransactionFailedDto implements TransactionFailedPayload {
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
  failureReason: string | null;

  @IsDateString()
  failedAt: string;
}
