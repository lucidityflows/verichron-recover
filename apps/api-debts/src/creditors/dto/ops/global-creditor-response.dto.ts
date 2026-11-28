import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IGlobalCreditor } from '@verichron/contracts';

/**
 * Response DTO for Global Creditor details.
 */
export class GlobalCreditorResponseDto implements IGlobalCreditor {
  @ApiProperty({ example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479' })
  id: string;

  @ApiProperty({ example: 'JPMorgan Chase N.A.' })
  canonicalName: string;

  @ApiPropertyOptional({ example: '13-2890427' })
  verifiedEIN?: string;

  @ApiPropertyOptional({ example: ['Chase Bank', 'JPM'] })
  knownAliases?: string[];

  @ApiPropertyOptional({ example: 'Banking' })
  industry?: string;

  @ApiProperty({ example: true })
  isReferenceOnly: boolean;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, any>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
