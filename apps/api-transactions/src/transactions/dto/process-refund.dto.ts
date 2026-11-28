import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IProcessRefund } from '@verichron/contracts';

/**
 * Process Refund DTO
 *
 * Request body for processing a refund.
 * If amount is not specified, the full original transaction amount will be refunded.
 */
export class ProcessRefundDto implements IProcessRefund {
  @ApiPropertyOptional({
    description: 'Amount to refund (defaults to full transaction amount if not specified)',
    example: 50.00,
    type: 'number',
    format: 'decimal',
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'amount must be a number with up to 2 decimal places' },
  )
  @Min(0.01, { message: 'amount must be at least 0.01' })
  @Type(() => Number)
  amount?: number;

  @ApiProperty({
    description: 'Reason for issuing the refund',
    example: 'Customer requested refund due to duplicate charge',
  })
  @IsString({ message: 'reason must be a string' })
  @IsNotEmpty({ message: 'reason is required' })
  reason: string;
}
