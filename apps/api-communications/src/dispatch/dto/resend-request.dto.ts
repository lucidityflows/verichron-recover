import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * DTO for resending a failed communication
 *
 * Used by POST /dispatch/:logId/resend endpoint.
 * The logId is provided in the URL path.
 * Optionally allows updating context variables or overriding provider.
 */
export class ResendRequestDto {
  @ApiPropertyOptional({
    description: 'Updated context variables for template rendering (optional)',
    example: {
      debtorName: 'John Doe',
      amountDue: '$1,234.56',
    },
  })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Override gateway provider for retry (optional)',
    example: 'mock',
  })
  @IsString()
  @IsOptional()
  provider?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata for this resend attempt',
    example: { retryReason: 'manual-intervention', attemptNumber: 2 },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
