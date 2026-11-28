import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNotEmpty,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { DispatchMethod } from '@verichron/enums';

/**
 * DTO for manually dispatching a communication to a debtor
 *
 * Used by POST /dispatch endpoint to send ad-hoc communications.
 * The compliance engine will validate before dispatching.
 */
export class ManualDispatchDto {
  @ApiProperty({
    description: 'Debtor ID to send communication to',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  debtorId: string;

  @ApiPropertyOptional({
    description: 'Debt ID associated with this communication',
    example: '456fcdeb-51a2-43d7-b890-987654321xyz',
  })
  @IsUUID()
  @IsOptional()
  debtId?: string;

  @ApiProperty({
    description: 'Dispatch method (automated channel)',
    example: DispatchMethod.EMAIL,
    enum: DispatchMethod,
    enumName: 'DispatchMethod',
  })
  @IsEnum(DispatchMethod)
  @IsNotEmpty()
  type: DispatchMethod;

  @ApiProperty({
    description: 'Template ID to use for this communication',
    example: '789fcdeb-51a2-43d7-b890-123456789xyz',
  })
  @IsUUID()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({
    description: 'Context variables for template rendering (e.g., debtor name, amount, etc.)',
    example: {
      debtorName: 'John Doe',
      amountDue: '$1,234.56',
      dueDate: '2024-02-01',
    },
  })
  @IsObject()
  @IsNotEmpty()
  context: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Optional metadata for this dispatch',
    example: { campaign: 'monthly-reminder', priority: 'high' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Override gateway provider (if not specified, uses default)',
    example: 'sendgrid',
  })
  @IsString()
  @IsOptional()
  provider?: string;
}
