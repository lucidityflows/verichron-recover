import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsISO8601, IsUUID, IsEnum, IsArray, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { DebtCategory, FlowDimension } from '@verichron/enums';

/**
 * Query DTO for flow analytics internal endpoint
 * Used by event orchestrator to fetch debt flow data
 */
export class FlowAnalyticsInternalQueryDto {
  @ApiProperty({
    description: 'Flow dimension to visualize',
    enum: FlowDimension,
    enumName: 'FlowDimension',
  })
  @IsEnum(FlowDimension)
  view: FlowDimension;

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
    description: 'Filter by portfolio tags (comma-separated for multiple)',
    example: 'Q2-2024,Broker-Triton',
    type: String,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  @IsArray()
  @IsString({ each: true })
  portfolioTag?: string[];

  @ApiPropertyOptional({
    description: 'Filter by debt category',
    enum: DebtCategory,
    enumName: 'DebtCategory',
  })
  @IsOptional()
  @IsEnum(DebtCategory)
  debtCategory?: DebtCategory;
}
