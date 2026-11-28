import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsString,
  IsEnum,
  IsDateString,
  IsArray,
  ArrayMinSize,
  Min,
  IsOptional,
  IsNotEmpty,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentFrequency } from '@verichron/enums';
import { ICreatePlan } from '@verichron/contracts';

/**
 * Create Payment Plan DTO
 *
 * Request body for creating a new payment plan.
 * Supports multi-debt consolidation via debtIds array.
 * The total amount and installment amount are calculated by the service.
 */
export class CreatePlanDto implements ICreatePlan {
  @ApiProperty({
    description: 'Array of debt UUIDs to consolidate into this payment plan',
    example: ['789e0123-e89b-12d3-a456-426614174999', '789e0123-e89b-12d3-a456-426614174998'],
    type: [String],
    format: 'uuid',
    minItems: 1,
  })
  @IsArray({ message: 'debtIds must be an array' })
  @ArrayMinSize(1, { message: 'At least one debt must be included in the plan' })
  @IsUUID('4', { each: true, message: 'Each debtId must be a valid UUID' })
  debtIds: string[];

  @ApiProperty({
    description: 'Number of installment payments',
    example: 12,
    type: 'integer',
    minimum: 1,
  })
  @IsNumber({}, { message: 'numberOfInstallments must be a number' })
  @Min(1, { message: 'numberOfInstallments must be at least 1' })
  @Type(() => Number)
  numberOfInstallments: number;

  @ApiProperty({
    description: 'Payment frequency for scheduled installments',
    enum: PaymentFrequency,
    example: PaymentFrequency.MONTHLY,
  })
  @IsEnum(PaymentFrequency, {
    message: 'frequency must be a valid PaymentFrequency (WEEKLY, BI_WEEKLY, MONTHLY)',
  })
  frequency: PaymentFrequency;

  @ApiProperty({
    description: 'Date of the first scheduled payment (must be a future date)',
    example: '2024-02-01',
    type: 'string',
    format: 'date',
  })
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date' })
  @IsNotEmpty({ message: 'startDate is required' })
  startDate: string;

  @ApiProperty({
    description: 'Tokenized payment method for scheduled payments (from Stripe.js or similar)',
    example: 'tok_1234567890abcdef',
  })
  @IsString({ message: 'paymentMethodToken must be a string' })
  @IsNotEmpty({ message: 'paymentMethodToken is required' })
  paymentMethodToken: string;

  @ApiPropertyOptional({
    description: 'Optional down payment amount to be charged immediately upon plan activation',
    example: 100.00,
    type: 'number',
    format: 'decimal',
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'downPayment must be a number with up to 2 decimal places' },
  )
  @Min(0.01, { message: 'downPayment must be at least 0.01' })
  @Type(() => Number)
  downPayment?: number;

  @ApiPropertyOptional({
    description: 'Optional metadata to attach to the payment plan',
    example: { notes: 'Hardship case', source: 'debtor_portal' },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'metadata must be an object' })
  metadata?: Record<string, any>;
}