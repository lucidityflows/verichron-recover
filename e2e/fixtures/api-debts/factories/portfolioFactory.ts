import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { PortfolioStatus, DebtCategory } from '@verichron/enums';

/**
 * Portfolio Factory
 *
 * Creates portfolio test data directly in the api-debts database.
 * Portfolios are the organizational unit for debt management - users are granted
 * access at the portfolio level, not individual debts.
 *
 * @example
 * ```typescript
 * const portfolioFactory = createPortfolioFactory(debtsDataSource);
 *
 * // Create active portfolio with defaults
 * const portfolio = await portfolioFactory.createPortfolio({
 *   organizationId: org.id,
 *   name: 'Q1 2024 Credit Cards',
 * });
 *
 * // Create portfolio with custom values
 * const customPortfolio = await portfolioFactory.createPortfolio({
 *   organizationId: org.id,
 *   name: 'Medical Debt Portfolio',
 *   status: PortfolioStatus.PROVISIONING,
 *   purchasePrice: '50000.00',
 *   totalPrincipal: '250000.00',
 *   primaryDebtCategory: DebtCategory.MEDICAL,
 *   portfolioTags: ['Q1-2024', 'Medical-Mix'],
 *   businessDescription: 'Mixed medical consumer portfolio',
 * });
 * ```
 */

export interface CreatePortfolioOptions {
  id?: string;
  organizationId: string;
  name?: string;
  status?: PortfolioStatus;
  purchaseDate?: Date;
  purchasePrice?: string;
  totalPrincipal?: string;
  source?: string;
  primaryDebtCategory?: DebtCategory;
  portfolioTags?: string[];
  businessDescription?: string;
}

export interface Portfolio {
  id: string;
  organizationId: string;
  name: string;
  status: PortfolioStatus;
  purchaseDate: Date;
  purchasePrice: string;
  totalPrincipal: string;
  source: string;
  primaryDebtCategory: DebtCategory | null;
  portfolioTags: string[];
  businessDescription: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PortfolioFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Creates a portfolio with default test values.
   * Requires organizationId to enforce multi-tenancy.
   */
  async createPortfolio(options: CreatePortfolioOptions): Promise<Portfolio> {
    const defaultPurchaseDate = faker.date.past({ years: 1 });
    const defaultPurchasePrice = faker.number.int({ min: 10000, max: 500000 }).toFixed(2);
    const defaultTotalPrincipal = faker.number.int({ min: 50000, max: 2000000 }).toFixed(2);

    const [portfolio] = await this.dataSource.query(
      `
      INSERT INTO portfolios (
        id,
        organization_id,
        name,
        status,
        purchase_date,
        purchase_price,
        total_principal,
        source,
        primary_debt_category,
        portfolio_tags,
        business_description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        options.id || faker.string.uuid(),
        options.organizationId,
        options.name || `${faker.company.name()} - ${faker.finance.accountName()} Portfolio`,
        options.status || PortfolioStatus.ACTIVE,
        options.purchaseDate || defaultPurchaseDate,
        options.purchasePrice || defaultPurchasePrice,
        options.totalPrincipal || defaultTotalPrincipal,
        options.source || `${faker.company.name()} - ${faker.commerce.department()}`,
        options.primaryDebtCategory || null,
        options.portfolioTags || [],
        options.businessDescription || null,
      ],
    );

    return portfolio;
  }

  /**
   * Creates a portfolio in PROVISIONING status (newly created, not ready for use).
   */
  async createProvisioningPortfolio(options: Omit<CreatePortfolioOptions, 'status'>): Promise<Portfolio> {
    return this.createPortfolio({
      ...options,
      status: PortfolioStatus.PROVISIONING,
    });
  }

  /**
   * Creates a portfolio in ACTIVE status (ready for debt assignment and collection).
   */
  async createActivePortfolio(options: Omit<CreatePortfolioOptions, 'status'>): Promise<Portfolio> {
    return this.createPortfolio({
      ...options,
      status: PortfolioStatus.ACTIVE,
    });
  }

  /**
   * Creates a portfolio in CLOSED status (no longer accepting new debts).
   */
  async createClosedPortfolio(options: Omit<CreatePortfolioOptions, 'status'>): Promise<Portfolio> {
    return this.createPortfolio({
      ...options,
      status: PortfolioStatus.CLOSED,
    });
  }

  /**
   * Creates multiple portfolios for an organization.
   * Useful for testing list/query operations with multiple portfolios.
   */
  async createMultiplePortfolios(
    organizationId: string,
    count: number,
    overrides?: Partial<CreatePortfolioOptions>,
  ): Promise<Portfolio[]> {
    const portfolios: Portfolio[] = [];

    for (let i = 0; i < count; i++) {
      const portfolio = await this.createPortfolio({
        organizationId,
        name: `Test Portfolio ${i + 1}`,
        ...overrides,
      });
      portfolios.push(portfolio);
    }

    return portfolios;
  }
}

/**
 * Factory function to create a PortfolioFactory instance.
 * Follows the pattern established in other fixture factories.
 */
export function createPortfolioFactory(dataSource: DataSource): PortfolioFactory {
  return new PortfolioFactory(dataSource);
}
