import {
  IsUUID,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ICreateOwnershipHistory } from '@verichron/contracts';

/**
 * DTO for creating a new ownership history record.
 * 
 * **Internal Use Only**: This DTO is used by other modules (imports, portfolios)
 * when creating history records. It is NOT exposed via public API endpoints.
 * 
 * Typical Usage:
 * - Imports module: Creates initial history record when debt is first imported
 * - Portfolios module: Creates new history record when portfolio is transferred
 * 
 * Validation Rules:
 * - soldDate (if provided) must be >= acquiredDate
 * - acquiredDate should not be in the future
 * - source should be descriptive for audit purposes
 * 
 * Notes:
 * - id is auto-generated
 * - createdAt is auto-generated and immutable
 * - soldDate is typically null for new records (current owner)
 */
export class CreateOwnershipHistoryDto implements ICreateOwnershipHistory {
  @ApiProperty({
    description: 'Debt ID this ownership record applies to',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'debtId must be a valid UUID' })
  @IsNotEmpty({ message: 'debtId is required' })
  debtId: string;

  @ApiProperty({
    description: 'Organization ID that owns/owned the debt during this period',
    example: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'organizationId must be a valid UUID' })
  @IsNotEmpty({ message: 'organizationId is required' })
  organizationId: string;

  @ApiProperty({
    description: 'Date when this organization acquired the debt',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @IsDateString({}, { message: 'acquiredDate must be a valid ISO 8601 date string (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'acquiredDate is required' })
  acquiredDate: string;

  @ApiPropertyOptional({
    description: 'Date when this organization sold the debt. Null indicates current owner.',
    example: '2024-06-15',
    type: 'string',
    format: 'date',
    nullable: true,
  })
  @IsOptional()
  @IsDateString({}, { message: 'soldDate must be a valid ISO 8601 date string (YYYY-MM-DD)' })
  soldDate?: string | null;

  @ApiProperty({
    description: 'Description of how the debt was acquired. Should be descriptive for audit purposes.',
    example: 'Initial Import from First National Bank',
    maxLength: 500,
  })
  @IsString({ message: 'source must be a string' })
  @IsNotEmpty({ message: 'source is required' })
  @MaxLength(500, { message: 'source cannot exceed 500 characters' })
  source: string;
}

/**
 * Helper function to generate standard source strings.
 * Ensures consistency across the application.
 */
export class OwnershipHistorySourceHelper {
  static initialImport(creditorName: string): string {
    return `Initial Import from ${creditorName}`;
  }

  static portfolioTransfer(portfolioId: string, previousOrgName?: string): string {
    return previousOrgName
      ? `Transfer via Portfolio ${portfolioId} from ${previousOrgName}`
      : `Transfer via Portfolio ${portfolioId}`;
  }

  static individualPurchase(previousOrgName?: string): string {
    return previousOrgName
      ? `Individual Debt Purchase from ${previousOrgName}`
      : 'Individual Debt Purchase';
  }

  static custom(description: string): string {
    return description;
  }
}