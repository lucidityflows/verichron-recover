import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ICreateScheduledPayment } from '@verichron/contracts';

/**
 * Create Scheduled Payment DTO
 *
 * Internal DTO for creating scheduled payment transactions.
 * Called by the payment plans module, not directly by API clients.
 */
export class CreateScheduledPaymentDto implements ICreateScheduledPayment {
  @ApiProperty({
    description: 'Payment plan UUID',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'paymentPlanId must be a valid UUID' })
  paymentPlanId: string;

  @ApiProperty({
    description: 'Debt UUID (optional - can be retrieved from plan)',
    example: '789e0123-e89b-12d3-a456-426614174999',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'debtId must be a valid UUID' })
  debtId?: string;

  @ApiProperty({
    description: 'Debtor UUID (optional - can be retrieved from plan)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'debtorId must be a valid UUID' })
  debtorId?: string;

  @ApiProperty({
    description: 'Payment amount (typically the installment amount)',
    example: 125.00,
    type: 'number',
    format: 'decimal',
    minimum: 0.01,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'amount must be a number with up to 2 decimal places' },
  )
  @Min(0.01, { message: 'amount must be at least 0.01' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Tokenized payment method from the payment plan',
    example: 'tok_1234567890abcdef',
  })
  @IsString({ message: 'paymentMethodToken must be a string' })
  @IsNotEmpty({ message: 'paymentMethodToken is required' })
  paymentMethodToken: string;
}
