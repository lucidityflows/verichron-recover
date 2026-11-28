import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { ICreateImport } from '@verichron/contracts';

/**
 * DTO for creating a new bulk import job.
 *
 * This is submitted along with the CSV file upload.
 * The file itself is handled separately via Multer middleware.
 *
 * Workflow:
 * 1. User fills out import form with portfolio metadata
 * 2. User selects CSV file
 * 3. Frontend sends multipart/form-data with:
 *    - file: CSV file
 *    - portfolioName, purchaseDate, purchasePrice, source: form fields
 * 4. Backend creates ImportJob record and begins processing
 *
 * CSV File Requirements:
 * - Format: CSV with headers
 * - Required columns: accountNumber, principalAmount, originalCreditorName, originalDebtDate
 * - Optional columns: interestAmount, feesAmount, debtor information
 * - Max file size: 50MB
 * - Max rows: 50,000 (for MVP)
 */
export class CreateImportDto implements ICreateImport {
  @ApiProperty({
    description: 'Name for the portfolio to be created from this import',
    example: 'Q1 2024 Credit Card Purchase - First National Bank',
    maxLength: 255,
  })
  @IsString({ message: 'portfolioName must be a string' })
  @IsNotEmpty({ message: 'portfolioName is required' })
  @MaxLength(255, { message: 'portfolioName cannot exceed 255 characters' })
  portfolioName: string;

  @ApiProperty({
    description: 'Date the portfolio was acquired/purchased',
    example: '2024-01-15',
    type: 'string',
    format: 'date',
  })
  @IsDateString(
    {},
    { message: 'purchaseDate must be a valid ISO 8601 date string (YYYY-MM-DD)' },
  )
  @IsNotEmpty({ message: 'purchaseDate is required' })
  purchaseDate: string;

  @ApiProperty({
    description: 'Amount paid to acquire this portfolio in USD',
    example: 250000.0,
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
    description:
      'Origin/source of the portfolio (e.g., creditor name, acquisition details)',
    example: 'First National Bank - Charged-off Credit Cards',
    maxLength: 500,
  })
  @IsString({ message: 'source must be a string' })
  @IsNotEmpty({ message: 'source is required' })
  @MaxLength(500, { message: 'source cannot exceed 500 characters' })
  source: string;

  @ApiPropertyOptional({
    description: 'Temporary file ID returned from inspection step',
    example: 'temp_123456789'
  })
  @IsOptional()
  @IsString()
  tempFileId?: string;

  @ApiPropertyOptional({
    description: 'Map of source CSV headers to Verichron target fields',
    example: { 'Acct#': 'accountNumber', 'Principal': 'principalAmount' }
  })
  @IsOptional()
  @IsObject({ message: 'columnMapping must be an object' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
    return value;
  })
  columnMapping?: Record<string, string>;
}

/**
 * CSV Row interface - represents one row from the import file
 *
 * This is used internally during parsing and validation.
 */
export interface CsvRow {
  // Required fields
  accountNumber: string;
  principalAmount: number;
  originalCreditorName: string;
  originalDebtDate: string; // YYYY-MM-DD format

  // Optional debt fields
  interestAmount?: number;
  feesAmount?: number;

  // Optional debtor fields
  debtorFirstName?: string;
  debtorLastName?: string;
  debtorEmail?: string;
  debtorPhone?: string;
  debtorAddressLine1?: string;
  debtorAddressLine2?: string;
  debtorCity?: string;
  debtorState?: string;
  debtorZipCode?: string;

  // Internal - added during processing
  _rowNumber?: number;
  _debtorKey?: string; // Deterministic handle for identity/profile handshake
}

/**
 * Validation result for a single CSV row
 */
export interface RowValidationResult {
  rowNumber: number;
  isValid: boolean;
  errors: string[];
}
