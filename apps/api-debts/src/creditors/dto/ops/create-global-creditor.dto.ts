import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ICreateGlobalCreditor } from '@verichron/contracts';

/**
 * DTO for creating a new platform-level global creditor (Master List).
 *
 * Implements ICreateGlobalCreditor from @verichron/contracts.
 */
export class CreateGlobalCreditorDto implements ICreateGlobalCreditor {
  @ApiProperty({
    description: 'Canonical, verified legal name of the creditor',
    example: 'JPMorgan Chase N.A.',
    maxLength: 255,
  })
  @IsString()
  canonicalName: string;

  @ApiPropertyOptional({
    description: 'Verified Employer Identification Number (EIN)',
    example: '13-2890427',
    maxLength: 10,
  })
  @IsString()
  @IsOptional()
  verifiedEIN?: string;

  @ApiPropertyOptional({
    description: 'Known aliases for fuzzy matching',
    example: ['Chase Bank', 'JPM'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  knownAliases?: string[];

  @ApiPropertyOptional({
    description: 'Industry classification',
    example: 'Banking',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({
    description: 'If true, this is a reference-only Gold List entry',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isReferenceOnly?: boolean;

  @ApiPropertyOptional({
    description: 'Extensible metadata',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
