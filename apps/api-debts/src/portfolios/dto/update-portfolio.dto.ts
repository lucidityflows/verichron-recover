import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IUpdatePortfolio } from '@verichron/contracts';
import { PortfolioStatus } from '@verichron/enums';

/**
 * DTO for updating a portfolio record.
 *
 * All fields are optional - only provided fields will be updated.
 *
 * Notes:
 * - totalPrincipal is typically recalculated when debts are added/removed
 * - status changes must follow valid status transitions
 * - Cannot update if portfolio status is SOLD
 */
export class UpdatePortfolioDto implements IUpdatePortfolio {
  @ApiPropertyOptional({
    description: 'Update portfolio name',
    example: 'Q1 2024 Credit Card Purchase - Updated',
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'name must be a string' })
  @MaxLength(255, { message: 'name cannot exceed 255 characters' })
  name?: string;

  @ApiPropertyOptional({
    description: 'Update purchase date',
    example: '2024-01-15',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'purchaseDate must be a valid ISO 8601 date string' })
  purchaseDate?: string;

  @ApiPropertyOptional({
    description: 'Update purchase price in USD',
    example: 275000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'purchasePrice must be a number with at most 2 decimal places' },
  )
  @Min(0, { message: 'purchasePrice cannot be negative' })
  @Type(() => Number)
  purchasePrice?: number;

  @ApiPropertyOptional({
    description: 'Update total principal. Typically recalculated automatically.',
    example: 1600000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'totalPrincipal must be a number with at most 2 decimal places' },
  )
  @Min(0, { message: 'totalPrincipal cannot be negative' })
  @Type(() => Number)
  totalPrincipal?: number;

  @ApiPropertyOptional({
    description: 'Update source/origin information',
    example: 'First National Bank - Updated',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'source must be a string' })
  @MaxLength(500, { message: 'source cannot exceed 500 characters' })
  source?: string;

  @ApiPropertyOptional({
    description: 'Update portfolio status. Must follow valid status transitions.',
    enum: PortfolioStatus, enumName: 'PortfolioStatus',
    example: PortfolioStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PortfolioStatus, { message: 'status must be a valid PortfolioStatus enum value' })
  status?: PortfolioStatus;
}
