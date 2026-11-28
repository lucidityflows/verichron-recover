import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TemplateType } from '@verichron/enums';

/**
 * DTO for creating a new communication template
 */
export class CreateTemplateDto {
  @ApiProperty({
    description: 'Template identifier name (unique per organization)',
    example: 'payment-receipt',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Human-readable display name',
    example: 'Payment Receipt Email',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  displayName: string;

  @ApiProperty({
    description: 'Template type',
    example: TemplateType.EMAIL,
    enum: TemplateType,
    enumName: 'TemplateType',
  })
  @IsEnum(TemplateType)
  @IsNotEmpty()
  type: TemplateType;

  @ApiPropertyOptional({
    description: 'Email subject line (required for EMAIL type, uses Handlebars syntax)',
    example: 'Payment Receipt - {{currency amount}}',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  subject?: string;

  @ApiProperty({
    description: 'Template body (Handlebars syntax, HTML for email, plain text for SMS/LETTER)',
    example: '<p>Thank you for your payment of {{currency amount}}.</p>',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    description: 'Template description for documentation',
    example: 'Sent after successful payment transaction',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'List of required Handlebars variables',
    example: ['amount', 'transactionId', 'date'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredVariables?: string[];

  @ApiPropertyOptional({
    description: 'Additional metadata for categorization',
    example: { category: 'payment', priority: 'high' },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
