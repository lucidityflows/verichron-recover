import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsEnum } from 'class-validator';
import { StateAbbreviation } from '@verichron/enums';

/**
 * Query DTO for geographic creditor analytics (internal endpoint)
 * Returns creditor and debt metrics grouped by creditor state
 */
export class GeographicCreditorsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by specific states (state codes)',
    example: [StateAbbreviation.TX, StateAbbreviation.CA, StateAbbreviation.NY],
    enum: StateAbbreviation,
    enumName: 'StateAbbreviation',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(StateAbbreviation, { each: true })
  states?: StateAbbreviation[];

  @ApiPropertyOptional({
    description: 'Filter by portfolio ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  portfolioId?: string;

  @ApiPropertyOptional({
    description: 'Start date for date range filter (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for date range filter (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsString()
  endDate?: string;
}
