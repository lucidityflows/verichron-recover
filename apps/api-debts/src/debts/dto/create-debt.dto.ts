import {
  IsUUID,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  ArrayMinSize,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DebtStatus, DebtCategory } from '@verichron/enums';
import { ICreateDebt } from '@verichron/contracts';

/**
 * DTO for creating a new debt record.
 * 
 * Typically used by:
 * - Bulk import module (primary use case)
 * - Manual debt entry by admins (rare)
 * 
 * Notes:
 * - organizationId is extracted from JWT via @OrganizationId() decorator, not from request body
 * - currentBalance is calculated automatically (principal + interest + fees)
 * - id, createdAt, updatedAt are auto-generated
 * - lastPaymentDate is null initially, updated via TransactionSucceeded events
 */
export class CreateDebtDto implements ICreateDebt {
  @ApiPropertyOptional({
    description: 'Debtor Identity ID (global identifier for the person). Required for debt creation, typically provided by the import process.',
    example: '789fcdeb-51a2-43d7-b890-123456789abc',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'debtorIdentityId must be a valid UUID' })
  @IsOptional()
  debtorIdentityId?: string; // NEW - Added for DebtCreated event payload

  @ApiProperty({
    description: 'Portfolio this debt belongs to. Must be a portfolio owned by the requesting organization.',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'portfolioId must be a valid UUID' })
  @IsNotEmpty({ message: 'portfolioId is required' })
  portfolioId: string;

  @ApiProperty({
    description: 'Name of the original creditor who issued this debt',
    example: 'First National Bank',
    maxLength: 255,
  })
  @IsString({ message: 'originalCreditorName must be a string' })
  @IsNotEmpty({ message: 'originalCreditorName is required' })
  @MaxLength(255, { message: 'originalCreditorName cannot exceed 255 characters' })
  originalCreditorName: string;

  @ApiProperty({
    description: 'Original creditor account number. Must be unique within the organization.',
    example: 'ACC-2024-00123456',
    maxLength: 100,
  })
  @IsString({ message: 'accountNumber must be a string' })
  @IsNotEmpty({ message: 'accountNumber is required' })
  @MaxLength(100, { message: 'accountNumber cannot exceed 100 characters' })
  accountNumber: string;

  @ApiProperty({
    description: 'Original principal amount of the debt in USD. This field is immutable after creation.',
    example: 5000.00,
    type: 'number',
    format: 'decimal',
    minimum: 0.01,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'principalAmount must be a number with at most 2 decimal places' },
  )
  @IsPositive({ message: 'principalAmount must be greater than 0' })
  @Type(() => Number)
  principalAmount: number;

  @ApiPropertyOptional({
    description: 'Accrued interest on the debt in USD. Defaults to 0 if not provided.',
    example: 250.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'interestAmount must be a number with at most 2 decimal places' },
  )
  @Min(0, { message: 'interestAmount cannot be negative' })
  @Type(() => Number)
  interestAmount?: number;

  @ApiPropertyOptional({
    description: 'Additional fees associated with the debt in USD. Defaults to 0 if not provided.',
    example: 100.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'feesAmount must be a number with at most 2 decimal places' },
  )
  @Min(0, { message: 'feesAmount cannot be negative' })
  @Type(() => Number)
  feesAmount?: number;

  @ApiPropertyOptional({
    description: 'Initial status of the debt. Defaults to IMPORTED if not provided.',
    enum: DebtStatus, enumName: 'DebtStatus',
    example: DebtStatus.IMPORTED,
    default: DebtStatus.IMPORTED,
  })
  @IsEnum(DebtStatus, { message: 'status must be a valid DebtStatus enum value' })
  status: DebtStatus;

  @ApiPropertyOptional({
    description: 'Canonical debt type classification. Defaults to OTHER if not provided.',
    enum: DebtCategory,
    enumName: 'DebtCategory',
    example: DebtCategory.MEDICAL,
    default: DebtCategory.OTHER,
  })
  @IsOptional()
  @IsEnum(DebtCategory, { message: 'debtCategory must be a valid DebtCategory enum value' })
  debtCategory?: DebtCategory;

  @ApiPropertyOptional({
    description: 'Optional subcategory for more specific classification (e.g., "Emergency Room Visit", "Subprime Auto")',
    example: 'Emergency Room Visit',
    maxLength: 100,
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'debtSubcategory must be a string' })
  @MaxLength(100, { message: 'debtSubcategory cannot exceed 100 characters' })
  debtSubcategory?: string;

  @ApiProperty({
    description: 'Date the original debt was incurred. This field is immutable after creation. Must be a date in the past or today.',
    example: '2023-06-15',
    type: 'string',
    format: 'date',
  })
  @IsDateString({}, { message: 'originalDebtDate must be a valid ISO 8601 date string (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'originalDebtDate is required' })
  originalDebtDate: string;

  @ApiProperty({
    description: 'Array of debtor profile UUIDs associated with this debt. Must include at least one debtor profile. Use this for co-debtors (spouses, co-signers).',
    example: ['8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c', '3d2e5f4b-1c9a-4e7d-8b2f-6a5c9e1d3f8b'],
    type: [String],
    format: 'uuid',
    minItems: 1,
  })
  @IsArray({ message: 'debtorProfileIds must be an array' })
  @ArrayMinSize(1, { message: 'At least one debtor profile must be associated with this debt' })
  @IsUUID('4', { each: true, message: 'Each debtorProfileId must be a valid UUID' })
  debtorProfileIds: string[];

  @ApiPropertyOptional({
    description: 'Initial notes about this debt. Can be added or updated later by collectors.',
    example: 'Debt originated from credit card account. Debtor indicated willingness to negotiate.',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  notes?: string;
}