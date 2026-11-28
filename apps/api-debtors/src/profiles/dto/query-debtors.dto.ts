import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IQueryDebtors } from '@verichron/contracts';
import { DebtorVerificationStatus, SortOrder } from '@verichron/enums';

/**
 * DTO for querying/filtering debtor profiles
 */
export class QueryDebtorsDto implements IQueryDebtors {
  @ApiPropertyOptional({
    description: 'Filter by first name (partial match)',
    example: 'John',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'Filter by last name (partial match)',
    example: 'Doe',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Filter by verification status',
    example: DebtorVerificationStatus.VERIFIED,
    enum: DebtorVerificationStatus, enumName: 'DebtorVerificationStatus',
  })
  @IsEnum(DebtorVerificationStatus)
  @IsOptional()
  verificationStatus?: DebtorVerificationStatus;

  @ApiPropertyOptional({
    description: 'Filter by user ID',
    example: '987fcdeb-51a2-43d7-b890-123456789abc',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Filter by organization ID (requires organization access)',
    example: '456fcdeb-51a2-43d7-b890-987654321xyz',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({
    description: 'Search query (searches across first name, last name, email, phone)',
    example: 'john',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-indexed)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Filter by whether debtor has a user account',
    example: true,
  })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  hasUserAccount?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by creation date (after this date)',
    example: '2024-01-01',
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  createdAfter?: string;

  @ApiPropertyOptional({
    description: 'Filter by creation date (before this date)',
    example: '2024-12-31',
    format: 'date',
  })
  @IsDateString()
  @IsOptional()
  createdBefore?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'lastName',
    enum: ['firstName', 'lastName', 'createdAt', 'updatedAt'],
    default: 'lastName',
  })
  @IsEnum(['firstName', 'lastName', 'createdAt', 'updatedAt'])
  @IsOptional()
  sortBy?: 'firstName' | 'lastName' | 'createdAt' | 'updatedAt';

  @ApiPropertyOptional({
    description: 'Sort direction',
    example: 'ASC',
    enum: SortOrder,
    enumName: 'SortOrder',
    default: 'ASC',
  })
  @IsEnum(SortOrder)
  @IsOptional()
  sortDirection?: SortOrder;

  @ApiPropertyOptional({
    description: 'Sort order (alias for sortDirection)',
    example: SortOrder.ASC,
    enum: SortOrder,
    enumName: 'SortOrder',
    default: SortOrder.ASC,
  })
  @IsEnum(SortOrder)
  @IsOptional()
  sortOrder?: SortOrder;
}
