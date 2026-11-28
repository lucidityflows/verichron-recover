import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { IGenerateReceipt } from '@verichron/contracts';

/**
 * Generate Payment Receipt DTO
 *
 * Request body for generating a payment receipt PDF for a transaction.
 * The receipt contains transaction details, amount, date, and payment method.
 * Typically auto-generated after successful payment processing.
 */
export class GenerateReceiptDto implements IGenerateReceipt {
  @ApiProperty({
    description: 'Transaction ID for which to generate the receipt',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'transactionId is required' })
  @IsUUID('4', { message: 'transactionId must be a valid UUID' })
  transactionId: string;
}
