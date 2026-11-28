import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { IGenerateAgreement } from '@verichron/contracts';

/**
 * Generate Payment Agreement DTO
 *
 * Request body for generating a payment agreement PDF for a payment plan.
 * The agreement contains plan terms, debtor information, and signature fields.
 */
export class GenerateAgreementDto implements IGenerateAgreement {
  @ApiProperty({
    description: 'Payment plan ID for which to generate the agreement',
    example: '456e7890-e89b-12d3-a456-426614174888',
    format: 'uuid',
  })
  @IsNotEmpty({ message: 'planId is required' })
  @IsUUID('4', { message: 'planId must be a valid UUID' })
  planId: string;
}
