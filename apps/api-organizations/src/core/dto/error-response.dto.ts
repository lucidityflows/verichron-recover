import { ApiProperty } from '@nestjs/swagger';

/**
 * Standardized error response format for all API errors
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'HTTP status code',
    example: 404,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Error message or array of validation errors',
    oneOf: [
      { type: 'string' },
      { type: 'array', items: { type: 'string' } },
    ],
    example: 'Organization not found',
  })
  message!: string | string[];

  @ApiProperty({
    description: 'Stable, unique machine-readable code for the error type (e.g., USERS_001, DEBTS_002)',
    example: 'ORGS_NOT_FOUND_001',
  })
  errorCode!: string;

  @ApiProperty({
    description: 'ISO 8601 timestamp',
    example: '2025-10-18T10:30:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Request path',
    example: '/orgs/123',
  })
  path!: string;

  @ApiProperty({
    description: 'Request correlation ID',
    required: false,
    example: 'abc-123-def-456',
  })
  requestId?: string;
}
