import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IAssignUser, ITransferPortfolio } from '@verichron/contracts';

/**
 * DTO for assigning a user to a portfolio.
 *
 * Creates Layer 2 authorization for the user to access debts in this portfolio.
 */
export class AssignUserDto implements IAssignUser {
  @ApiProperty({
    description: 'User ID to grant access to. User must belong to the same organization.',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  @IsNotEmpty({ message: 'userId is required' })
  userId: string;
}

/**
 * DTO for transferring a portfolio to another organization.
 *
 * Represents a portfolio sale/ownership transfer.
 * This is a critical operation that triggers cascading updates.
 */
export class TransferPortfolioDto implements ITransferPortfolio {
  @ApiProperty({
    description: 'Organization ID to transfer portfolio to',
    example: '3d2e5f4b-1c9a-4e7d-8b2f-6a5c9e1d3f8b',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'newOrganizationId must be a valid UUID' })
  @IsNotEmpty({ message: 'newOrganizationId is required' })
  newOrganizationId: string;

  @ApiPropertyOptional({
    description: 'Date of the transfer. Defaults to today if not provided.',
    example: '2024-01-20',
    format: 'date',
  })
  @IsOptional()
  @IsDateString({}, { message: 'transferDate must be a valid ISO 8601 date string' })
  transferDate?: string;

  @ApiPropertyOptional({
    description: 'Sale price of the portfolio in USD',
    example: 180000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'transferPrice must be a number with at most 2 decimal places' },
  )
  @Min(0, { message: 'transferPrice cannot be negative' })
  @Type(() => Number)
  transferPrice?: number;

  @ApiPropertyOptional({
    description: 'Optional notes about the transfer',
    example: 'Portfolio sold to XYZ Collections per contract ABC-123',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  notes?: string;
}
