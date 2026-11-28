import { ApiProperty } from '@nestjs/swagger';
import {
  IPortfolioResponse,
  IPaginatedPortfolioResponse,
  IPortfolioUserAccess,
} from '@verichron/contracts';
import { PortfolioStatus, DebtCategory } from '@verichron/enums';
import { Portfolio } from '../entities/portfolio.entity';

/**
 * DTO for portfolio response data.
 *
 * Represents a complete portfolio record with calculated metrics.
 */
export class PortfolioResponseDto implements IPortfolioResponse {
  @ApiProperty({
    description: 'Unique portfolio identifier',
    example: '9f8e7d6c-5b4a-3219-8f7e-6d5c4b3a2918',
  })
  id: string;

  @ApiProperty({
    description: 'Organization that owns this portfolio',
    example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  })
  organizationId: string;

  @ApiProperty({
    description: 'Portfolio name',
    example: 'Q1 2024 Credit Card Purchase',
  })
  name: string;

  @ApiProperty({
    description: 'Portfolio status',
    enum: PortfolioStatus, enumName: 'PortfolioStatus',
    example: PortfolioStatus.ACTIVE,
  })
  status: PortfolioStatus;

  @ApiProperty({
    description: 'Date when portfolio was acquired',
    example: '2024-01-15',
    format: 'date',
  })
  purchaseDate: string;

  @ApiProperty({
    description: 'Amount paid to acquire the portfolio',
    example: '250000.00',
  })
  purchasePrice: string;

  @ApiProperty({
    description: 'Total principal of all debts in portfolio',
    example: '1500000.00',
  })
  totalPrincipal: string;

  @ApiProperty({
    description: 'Source/origin of the portfolio',
    example: 'First National Bank',
  })
  source: string;

  @ApiProperty({
    description: 'Primary debt category hint (nullable)',
    enum: DebtCategory,
    enumName: 'DebtCategory',
    example: DebtCategory.MEDICAL,
    nullable: true,
  })
  primaryDebtCategory: DebtCategory | null;

  @ApiProperty({
    description: 'User-defined tags for organization and filtering',
    example: ['Q2-2024', 'Broker-Triton', 'Consumer-Mix'],
    type: String,
    isArray: true,
  })
  portfolioTags: string[];

  @ApiProperty({
    description: 'Business context and notes about this portfolio',
    example: 'Mixed consumer portfolio from Triton Financial',
    nullable: true,
  })
  businessDescription: string | null;

  @ApiProperty({
    description: 'Number of debts in this portfolio',
    example: 250,
  })
  debtCount: number;

  @ApiProperty({
    description: 'Total current balance of all debts',
    example: '1575000.00',
  })
  totalCurrentBalance: string;

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
   * Factory method to create DTO from entity with metrics.
   */
  static fromEntity(
    portfolio: Portfolio,
    debtCount: number,
    totalCurrentBalance: string,
  ): PortfolioResponseDto {
    const dto = new PortfolioResponseDto();
    dto.id = portfolio.id;
    dto.organizationId = portfolio.organizationId;
    dto.name = portfolio.name;
    dto.status = portfolio.status;
    // Handle both Date objects and string dates from database
    dto.purchaseDate = portfolio.purchaseDate
      ? (portfolio.purchaseDate instanceof Date
          ? portfolio.purchaseDate.toISOString().split('T')[0]
          : portfolio.purchaseDate)
      : '';
    dto.purchasePrice = portfolio.purchasePrice;
    dto.totalPrincipal = portfolio.totalPrincipal;
    dto.source = portfolio.source;
    dto.primaryDebtCategory = portfolio.primaryDebtCategory;
    dto.portfolioTags = portfolio.portfolioTags;
    dto.businessDescription = portfolio.businessDescription;
    dto.debtCount = debtCount;
    dto.totalCurrentBalance = totalCurrentBalance;
    // Handle both Date objects and string timestamps from database
    dto.createdAt = portfolio.createdAt
      ? (portfolio.createdAt instanceof Date
          ? portfolio.createdAt.toISOString()
          : portfolio.createdAt)
      : '';
    dto.updatedAt = portfolio.updatedAt
      ? (portfolio.updatedAt instanceof Date
          ? portfolio.updatedAt.toISOString()
          : portfolio.updatedAt)
      : '';
    return dto;
  }
}

/**
 * DTO for paginated portfolio query results.
 */
export class PaginatedPortfolioResponseDto implements IPaginatedPortfolioResponse {
  @ApiProperty({
    description: 'Array of portfolio records',
    type: [PortfolioResponseDto],
  })
  data: IPortfolioResponse[];

  @ApiProperty({
    description: 'Total number of items across all pages',
    example: 45,
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
    example: 3,
  })
  totalPages: number;

  /**
   * Factory method to create paginated response.
   */
  static create(
    portfolios: Array<{ portfolio: Portfolio; debtCount: number; totalCurrentBalance: string }>,
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedPortfolioResponseDto {
    const dto = new PaginatedPortfolioResponseDto();
    dto.data = portfolios.map((item) =>
      PortfolioResponseDto.fromEntity(item.portfolio, item.debtCount, item.totalCurrentBalance),
    );
    dto.total = total;
    dto.page = page;
    dto.pageSize = pageSize;
    dto.totalPages = Math.ceil(total / pageSize);
    return dto;
  }
}

/**
 * DTO for portfolio user access information.
 */
export class PortfolioUserAccessDto implements IPortfolioUserAccess {
  @ApiProperty({
    description: 'User ID who has access',
    example: '8f8c7e65-4b3a-4f1e-9c2d-5a7b9e3f1d4c',
  })
  userId: string;

  @ApiProperty({
    description: 'Timestamp when access was granted',
    example: '2024-01-15T10:30:00.000Z',
  })
  grantedAt: string;
}
