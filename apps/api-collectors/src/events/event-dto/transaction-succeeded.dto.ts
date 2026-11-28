import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, IsISO8601 } from 'class-validator';
import { TransactionSucceededPayload } from '@verichron/events';

export class TransactionSucceededDto implements TransactionSucceededPayload {
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
  @IsNotEmpty()
  debtorId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  gatewayTransactionId: string;

  @IsISO8601()
  @IsNotEmpty()
  succeededAt: string;
}
