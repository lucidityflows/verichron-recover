import {
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DebtStatus } from '@verichron/enums';
import { IUpdateDebt } from '@verichron/contracts';

/**
 * DTO for updating a debt record.
 *
 * All fields are optional - only provided fields will be updated.
 * Some fields have restricted access based on permissions:
 * - notes: Requires debt:update:notes OR debt:update permission
 * - interestAmount, feesAmount: Requires debt:update permission
 * - status: Requires debt:update permission + valid status transition
 *
 * Immutable fields (cannot be updated):
 * - principalAmount (original debt amount)
 * - originalCreditorName
 * - accountNumber
 * - originalDebtDate
 * - debtorIds (use separate endpoints for debtor management)
 */
export class UpdateDebtDto implements IUpdateDebt {
  @ApiPropertyOptional({
    description: 'Update debt status. Must follow valid status transitions.',
    enum: DebtStatus, enumName: 'DebtStatus',
    example: DebtStatus.IN_COLLECTION,
  })
  @IsOptional()
  @IsEnum(DebtStatus, { message: 'status must be a valid DebtStatus enum value' })
  status?: DebtStatus;

  @ApiPropertyOptional({
    description: 'Update interest amount in USD. Requires debt:update permission.',
    example: 300.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
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
    description: 'Update fees amount in USD. Requires debt:update permission.',
    example: 150.00,
    type: 'number',
    format: 'decimal',
    minimum: 0,
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
    description: 'Update notes. Requires debt:update:notes or debt:update permission.',
    example: 'Debtor agreed to payment plan starting next month.',
  })
  @IsOptional()
  @IsString({ message: 'notes must be a string' })
  notes?: string;
}
