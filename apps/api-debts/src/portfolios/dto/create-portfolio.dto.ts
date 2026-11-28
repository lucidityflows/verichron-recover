import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PortfolioStatus } from '@verichron/enums';
import { ICreatePortfolio } from '@verichron/contracts';

/**
 * DTO for creating a new portfolio record.
 * 
 * Typically used by:
 * - Bulk import module (primary use case - creates portfolio during import workflow)
 * - Manual portfolio creation by admins (rare)
 * 
 * Notes:
 * - organizationId is extracted from JWT via @OrganizationId() decorator, not from request body
 * - status defaults to PROVISIONING if not provided
 * - totalPrincipal is set during import by summing debt principals
 * - id, createdAt, updatedAt are auto-generated
 */
export class CreatePortfolioDto implements ICreatePortfolio {
  @ApiProperty({
    description: 'Human-readable name for the portfolio',
    example: 'Q1 2024 Credit Card Purchase - First National Bank',
    maxLength: 255,
  })
  @IsString({ message: 'name must be a string' })
  @IsNotEmpty({ message: 'name is required' })
  @MaxLength(255, { message: 'name cannot exceed 255 characters' })
  name: string;

  @ApiProperty({
    description: 'Date the portfolio was acquired by the organization',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @IsDateString({}, { message: 'purchaseDate must be a valid ISO 8601 date string (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'purchaseDate is required' })
  purchaseDate: string;

  @ApiProperty({
    description: 'Amount paid to acquire this portfolio in USD',
    example: 250000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'purchasePrice must be a number with at most 2 decimal places' },
  )
  @Min(0, { message: 'purchasePrice cannot be negative' })
  @Type(() => Number)
  purchasePrice: number;

  @ApiProperty({
    description: 'Sum of all debt principal amounts in this portfolio. Typically calculated during import.',
    example: 1500000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'totalPrincipal must be a number with at most 2 decimal places' },
  )
  @Min(0, { message: 'totalPrincipal cannot be negative' })
  @Type(() => Number)
  totalPrincipal: number;

  @ApiProperty({
    description: 'Origin/source of the portfolio (e.g., creditor name, acquisition details)',
    example: 'First National Bank - Charged-off Credit Cards',
    maxLength: 500,
  })
  @IsString({ message: 'source must be a string' })
  @IsNotEmpty({ message: 'source is required' })
  @MaxLength(500, { message: 'source cannot exceed 500 characters' })
  source: string;

  @ApiPropertyOptional({
    description: 'Initial status of the portfolio. Defaults to PROVISIONING if not provided.',
    enum: PortfolioStatus, enumName: 'PortfolioStatus',
    example: PortfolioStatus.PROVISIONING,
    default: PortfolioStatus.PROVISIONING,
  })
  @IsOptional()
  @IsEnum(PortfolioStatus, { message: 'status must be a valid PortfolioStatus enum value' })
  status?: PortfolioStatus;
}