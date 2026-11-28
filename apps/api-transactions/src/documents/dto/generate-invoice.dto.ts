import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { IGenerateInvoice } from '@verichron/contracts';

/**
 * Generate Invoice DTO
 *
 * Request body for generating an invoice PDF for a debt.
 * The invoice contains debt details, amounts owed, and payment instructions.
 */
export class GenerateInvoiceDto implements IGenerateInvoice {
  @ApiProperty({
    description: 'Debt ID for which to generate the invoice',
    example: '789e0123-e89b-12d3-a456-426614174999',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'debtId is required' })
  @IsUUID('4', { message: 'debtId must be a valid UUID' })
  debtId: string;
}
