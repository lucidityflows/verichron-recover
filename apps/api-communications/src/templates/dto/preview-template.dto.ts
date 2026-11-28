import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

/**
 * DTO for previewing a template with test context data
 *
 * Used to render a template with sample variables to verify
 * the output before saving or dispatching.
 */
export class PreviewTemplateDto {
  @ApiProperty({
    description: 'Context data for Handlebars variable substitution',
    example: {
      amount: 100.00,
      transactionId: 'txn_abc123',
      date: '2024-01-15',
      customerName: 'John Doe',
      debtorFirstName: 'John',
      debtorLastName: 'Doe',
    },
  })
  @IsObject()
  @IsNotEmpty()
  context: Record<string, any>;
}
