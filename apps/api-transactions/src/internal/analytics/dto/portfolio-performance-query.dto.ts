import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsISO8601, IsUUID, IsArray, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Query DTO for portfolio performance internal endpoint
 * Used by event orchestrator to fetch payment/transaction data
 */
export class PortfolioPerformanceInternalQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for time range filter (ISO 8601)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for time range filter (ISO 8601)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by single portfolio UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  portfolioId?: string;

  @ApiPropertyOptional({
    description: 'List of portfolio IDs to include',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000', '456e7890-e89b-12d3-a456-426614174111'],
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsString({ each: true })
  portfolioIds?: string[];
}
