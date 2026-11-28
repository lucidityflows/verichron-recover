import { IsString, IsNumber, IsNotEmpty, IsUUID, IsISO8601 } from 'class-validator';
import type { TransactionFailedPayload } from '@verichron/events';

export class TransactionFailedDto implements TransactionFailedPayload {

  transactionId: string;
  debtId: string | null;
  paymentPlanId: string | null;
  failedAt: string;
  
  
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  failureReason: string;

  @IsISO8601()
  @IsNotEmpty()
  transactionDate: string;
}
