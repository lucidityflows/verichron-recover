import { ApiProperty } from '@nestjs/swagger';
import { IDebtResponse, IPaginatedDebtResponse } from '@verichron/contracts';
import { DebtStatus, DebtCategory } from '@verichron/enums';
import { Debt } from '../entities/debt.entity';

/**
 * DTO for debt response data.
 *
 * Represents a complete debt record returned by the API.
 */
export class DebtResponseDto implements IDebtResponse {
  @ApiProperty({
    description: 'Unique debt identifier',
    example: 'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7g8',
  })
  id: string;

  @ApiProperty({
    description: 'Organization that owns this debt',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Portfolio this debt belongs to',
    example: '9f8e7d6c-5b4a-3219-8f7e-6d5c4b3a2918',
  })
  portfolioId: string;

  @ApiProperty({
    description: 'Original creditor name',
    example: 'First National Bank',
  })
  originalCreditorName: string;

  @ApiProperty({
    description: 'Account number from original creditor',
    example: 'ACC-2024-00123456',
  })
  accountNumber: string;

  @ApiProperty({
    description: 'Principal amount (original debt amount)',
    example: '5000.00',
  })
  principalAmount: string;

  @ApiProperty({
    description: 'Accrued interest amount',
    example: '250.00',
  })
  interestAmount: string;

  @ApiProperty({
    description: 'Fees and charges',
    example: '100.00',
  })
  feesAmount: string;

  @ApiProperty({
    description: 'Current outstanding balance (calculated)',
    example: '5350.00',
  })
  currentBalance: string;

  @ApiProperty({
    description: 'Current debt status',
    enum: DebtStatus, enumName: 'DebtStatus',
    example: DebtStatus.IN_COLLECTION,
  })
  status: DebtStatus;

  @ApiProperty({
    description: 'Canonical debt type classification',
    enum: DebtCategory,
    enumName: 'DebtCategory',
    example: DebtCategory.MEDICAL,
  })
  debtCategory: DebtCategory;

  @ApiProperty({
    description: 'Optional subcategory for more specific classification',
    example: 'Emergency Room Visit',
    nullable: true,
  })
  debtSubcategory: string | null;

  @ApiProperty({
    description: 'Date when original debt was incurred',
    example: '2023-06-15',
    format: 'date',
  })
  originalDebtDate: string;

  @ApiProperty({
    description: 'Date of last payment received (null if no payments)',
    example: '2024-01-15',
    format: 'date',
    nullable: true,
  })
  lastPaymentDate: string | null;

  @ApiProperty({
    description: 'IDs of associated debtor profiles',
    example: ['8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c'],
    type: [String],
  })
  debtorProfileIds: string[];

  @ApiProperty({
    description: 'Optional notes',
    example: 'Debtor indicated willingness to negotiate.',
    nullable: true,
  })
  notes: string | null;

  @ApiProperty({
    description: 'Record creation timestamp',
    example: '2024-01-10T14:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Record last update timestamp',
    example: '2024-01-15T10:15:00.000Z',
  })
  updatedAt: string;

  /**
   * Factory method to create DTO from entity.
   */
  static fromEntity(debt: Debt): DebtResponseDto {
    const dto = new DebtResponseDto();
    dto.id = debt.id;
    dto.organizationId = debt.organizationId;
    dto.portfolioId = debt.portfolioId;
    dto.originalCreditorName = debt.originalCreditorName;
    dto.accountNumber = debt.accountNumber;
    dto.principalAmount = debt.principalAmount;
    dto.interestAmount = debt.interestAmount;
    dto.feesAmount = debt.feesAmount;
    dto.currentBalance = debt.currentBalance;
    dto.status = debt.status;
    dto.debtCategory = debt.debtCategory;
    dto.debtSubcategory = debt.debtSubcategory;
    // Handle both Date objects and string dates from database
    dto.originalDebtDate = debt.originalDebtDate instanceof Date
      ? debt.originalDebtDate.toISOString().split('T')[0]
      : debt.originalDebtDate;
    dto.lastPaymentDate = debt.lastPaymentDate
      ? (debt.lastPaymentDate instanceof Date
          ? debt.lastPaymentDate.toISOString().split('T')[0]
          : debt.lastPaymentDate)
      : null;
    dto.debtorProfileIds = debt.debtorLinks?.map((link) => link.debtorProfileId) || [];
    dto.notes = debt.notes;
    // Handle both Date objects and string timestamps from database
    dto.createdAt = debt.createdAt instanceof Date
      ? debt.createdAt.toISOString()
      : debt.createdAt;
    dto.updatedAt = debt.updatedAt instanceof Date
      ? debt.updatedAt.toISOString()
      : debt.updatedAt;
    return dto;
  }
}

/**
 * DTO for paginated debt query results.
 */
export class PaginatedDebtResponseDto implements IPaginatedDebtResponse {
  @ApiProperty({
    description: 'Array of debt records',
    type: [DebtResponseDto],
  })
  data: IDebtResponse[];

  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  pageSize: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 8,
  })
  totalPages: number;

  /**
   * Factory method to create paginated response.
   */
  static create(
    debts: Debt[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedDebtResponseDto {
    const dto = new PaginatedDebtResponseDto();
    dto.data = debts.map((debt) => DebtResponseDto.fromEntity(debt));
    dto.total = total;
    dto.page = page;
    dto.pageSize = pageSize;
    dto.totalPages = Math.ceil(total / pageSize);
    return dto;
  }
}
