import { TransactionFailedPayload } from '@verichron/events';
import { IsNotEmpty, IsUUID, IsString, IsNumber, IsOptional, IsISO8601 } from 'class-validator';

export class PaymentFailedDto implements TransactionFailedPayload {
  @IsUUID()
  @IsNotEmpty()
  transactionId: string;

  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @IsUUID()
  @IsOptional()
  debtId: string | null;

  @IsUUID()
  @IsOptional()
  paymentPlanId: string | null;

  @IsUUID()
  @IsOptional()
  debtorId: string | null;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  failureReason: string | null;

  @IsISO8601()
  @IsNotEmpty()
  failedAt: string;
}
