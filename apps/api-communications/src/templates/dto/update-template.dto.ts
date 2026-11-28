import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO for updating a template
 *
 * Note: Updates create a new version (immutable versioning pattern).
 * The version number is automatically incremented by the service.
 */
export class UpdateTemplateDto {
  @ApiPropertyOptional({
    description: 'Updated display name',
    example: 'Payment Receipt Email (Updated)',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Updated email subject line (Handlebars syntax)',
    example: 'Payment Confirmation - {{currency amount}}',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  subject?: string;

  @ApiPropertyOptional({
    description: 'Updated template body (Handlebars syntax)',
    example: '<p>Your payment of {{currency amount}} has been received.</p>',
  })
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional({
    description: 'Updated description',
    example: 'Sent after successful payment with enhanced messaging',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated list of required variables',
    example: ['amount', 'transactionId', 'date', 'customerName'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredVariables?: string[];

  @ApiPropertyOptional({
    description: 'Updated metadata',
    example: { category: 'payment', priority: 'high', tags: ['receipt', 'confirmation'] },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
