import { ApiPropertyOptional } from '@nestjs/swagger';
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
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentFrequency } from '@verichron/enums';
import { IUpdatePlan } from '@verichron/contracts';

/**
 * Update Payment Plan DTO
 *
 * Request body for updating an existing payment plan.
 * Only DRAFT plans can be updated.
 * All fields are optional (partial update).
 */
export class UpdatePlanDto implements IUpdatePlan {
  @ApiPropertyOptional({
    description: 'Array of debt UUIDs to consolidate into this payment plan',
    example: ['789e0123-e89b-12d3-a456-426614174999', '789e0123-e89b-12d3-a456-426614174998'],
    type: [String],
    format: 'uuid',
    minItems: 1,
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'debtIds must be an array' })
  @ArrayMinSize(1, { message: 'At least one debt must be included in the plan' })
  @IsUUID('4', { each: true, message: 'Each debtId must be a valid UUID' })
  debtIds?: string[];

  @ApiPropertyOptional({
    description: 'Number of installment payments',
    example: 12,
    type: 'integer',
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'numberOfInstallments must be a number' })
  @Min(1, { message: 'numberOfInstallments must be at least 1' })
  @Type(() => Number)
  numberOfInstallments?: number;

  @ApiPropertyOptional({
    description: 'Payment frequency for scheduled installments',
    enum: PaymentFrequency,
    example: PaymentFrequency.MONTHLY,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentFrequency, {
    message: 'frequency must be a valid PaymentFrequency (WEEKLY, BI_WEEKLY, MONTHLY)',
  })
  frequency?: PaymentFrequency;

  @ApiPropertyOptional({
    description: 'Date of the first scheduled payment (must be a future date)',
    example: '2024-02-01',
    type: 'string',
    format: 'date',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date' })
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Tokenized payment method for scheduled payments',
    example: 'tok_1234567890abcdef',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'paymentMethodToken must be a string' })
  paymentMethodToken?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata to attach to the payment plan',
    example: { notes: 'Updated hardship case', source: 'admin_portal' },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'metadata must be an object' })
  metadata?: Record<string, any>;
}
