import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsObject, IsOptional, IsString, Min, Max } from 'class-validator';
import { IVerificationResult } from '@verichron/contracts';

/**
 * DTO for verification results from providers
 *
 * This is the standard response format returned by all verification providers
 */
export class VerificationResultDto implements IVerificationResult {
  @ApiProperty({
    description: 'Whether the verification request succeeded',
    example: true,
  })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'Whether the data was verified as valid',
    example: true,
  })
  @IsBoolean()
  verified: boolean;

  @ApiProperty({
    description: 'Confidence score (0-100)',
    example: 95,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence: number;

  @ApiProperty({
    description: 'Verification-type-specific details',
    example: {
      standardizedAddress: {
        streetLine1: '123 MAIN ST',
        city: 'ANYTOWN',
        state: 'CA',
        postalCode: '90210',
      },
    },
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  details: Record<string, any>;

  @ApiProperty({
    description: 'Provider name that performed the verification',
    example: 'USPS_STUB',
  })
  @IsString()
  provider: string;

  @ApiProperty({
    description: 'Cost of verification in cents',
    example: 5,
  })
  @IsNumber()
  costCents: number;

  @ApiPropertyOptional({
    description: 'Raw response from the provider',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  rawResponse?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Error message if verification failed',
    example: 'Invalid address format',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Error code if verification failed',
    example: 'INVALID_FORMAT',
  })
  @IsOptional()
  @IsString()
  errorCode?: string;
}
