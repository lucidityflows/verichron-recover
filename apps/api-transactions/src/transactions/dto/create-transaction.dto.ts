import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsString,
  IsOptional,
  IsObject,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ICreateTransaction } from '@verichron/contracts';

/**
 * Create Transaction DTO
 *
 * Request body for creating a one-time payment transaction.
 * All payment methods must be tokenized client-side before submission.
 */
export class CreateTransactionDto implements ICreateTransaction {
  @ApiProperty({
    description: 'UUID of the debt account this payment applies to',
    example: '789e0123-e89b-12d3-a456-426614174999',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'debtId must be a valid UUID' })
  @IsNotEmpty({ message: 'debtId is required' })
  debtId: string;

  @ApiProperty({
    description: 'UUID of the debtor making the payment (optional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'debtorId must be a valid UUID' })
  debtorId?: string;

  @ApiProperty({
    description: 'Payment amount in USD (must be positive with up to 2 decimal places)',
    example: 150.50,
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
    description:
      'Tokenized payment method reference (e.g., from Stripe.js tokenization). NEVER send raw card data.',
    example: 'tok_1234567890abcdef',
  })
  @IsString({ message: 'paymentMethodToken must be a string' })
  @IsNotEmpty({ message: 'paymentMethodToken is required' })
  paymentMethodToken: string;

  @ApiProperty({
    description:
      'Optional metadata to attach to the transaction (e.g., IP address, user agent)',
    example: { ip_address: '192.168.1.1', user_agent: 'Mozilla/5.0...' },
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsObject({ message: 'metadata must be an object' })
  metadata?: Record<string, any>;
}