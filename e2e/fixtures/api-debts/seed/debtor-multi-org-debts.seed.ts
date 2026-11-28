import { DataSource } from 'typeorm';
import { createDebtFactory, createPortfolioFactory, type Debt, type DebtDebtor } from '../factories';

/**
 * Seed: Debtor Multi-Org Debts Scenario
 *
 * Creates a test scenario where a single debtor has debts across multiple
 * organizations. This is the primary scenario for testing TC-DBT-ACCESS-001:
 * "Debtor Can Access Own Debts Across All Organizations"
 *
 * Scenario Setup:
 * - 1 debtor user with access to 3 organizations (Org A, B, C)
 * - 3 portfolios (one per organization)
 * - 10 total debts:
 *   - 5 debts owned by the debtor in Org A
 *   - 3 debts owned by the debtor in Org B
 *   - 2 debts owned by the debtor in Org C
 *
 * Expected Test Behavior:
 * - Debtor GET /debts/my-debts should return ALL 10 debts
 * - Query filters by: debtor_user_id = :userId AND organization_id IN (:organizationIds)
 * - Debtor sees seamless multi-org data aggregation
 *
 * @example
 * ```typescript
 * const scenario = await seedDebtorMultiOrgDebts(debtsDataSource, {
 *   debtorUserId: debtorUser.id,
 *   organizations: [
 *     { organizationId: orgA.id, portfolioId: portfolioA.id, debtCount: 5 },
 *     { organizationId: orgB.id, portfolioId: portfolioB.id, debtCount: 3 },
 *     { organizationId: orgC.id, portfolioId: portfolioC.id, debtCount: 2 },
 *   ],
 * });
 *
 * expect(scenario.totalDebts).toBe(10);
 * expect(scenario.orgADebts.length).toBe(5);
 * expect(scenario.orgBDebts.length).toBe(3);
 * expect(scenario.orgCDebts.length).toBe(2);
 * ```
 */

export interface OrgDebtConfig {
  organizationId: string;
  organizationName?: string;
  portfolioId?: string;
  debtCount: number;
}

export interface SeedDebtorMultiOrgDebtsOptions {
  debtorUserId: string;
  organizations: OrgDebtConfig[];
}

export interface DebtorMultiOrgDebtsScenario {
  debtorUserId: string;
  portfolios: Array<{ organizationId: string; portfolio: any }>;
  debtsByOrg: Map<string, Array<{ debt: Debt; debtDebtor: DebtDebtor }>>;
  allDebts: Array<{ debt: Debt; debtDebtor: DebtDebtor }>;
  totalDebts: number;
}

export async function seedDebtorMultiOrgDebts(
  dataSource: DataSource,
  options: SeedDebtorMultiOrgDebtsOptions,
): Promise<DebtorMultiOrgDebtsScenario> {
  const debtFactory = createDebtFactory(dataSource);
  const portfolioFactory = createPortfolioFactory(dataSource);

  const portfolios: Array<{ organizationId: string; portfolio: any }> = [];
  const debtsByOrg = new Map<string, Array<{ debt: Debt; debtDebtor: DebtDebtor }>>();
  const allDebts: Array<{ debt: Debt; debtDebtor: DebtDebtor }> = [];

  // Create portfolios and debts for each organization
  for (const orgConfig of options.organizations) {
    // Create or use provided portfolio
    const portfolio = orgConfig.portfolioId
      ? { id: orgConfig.portfolioId }
      : await portfolioFactory.createActivePortfolio({
          organizationId: orgConfig.organizationId,
          name: `${orgConfig.organizationName || 'Test Org'} - Primary Portfolio`,
        });

    portfolios.push({
      organizationId: orgConfig.organizationId,
      portfolio,
    });

    // Create debts for this organization
    const orgDebts: Array<{ debt: Debt; debtDebtor: DebtDebtor }> = [];

    for (let i = 0; i < orgConfig.debtCount; i++) {
      const result = await debtFactory.createDebtWithDebtor({
        organizationId: orgConfig.organizationId,
        portfolioId: portfolio.id,
        debtorId: options.debtorUserId,
        principalAmount: (1000 * (i + 1)).toFixed(2), // Varying amounts for easier identification
      });

      orgDebts.push(result);
      allDebts.push(result);
    }

    debtsByOrg.set(orgConfig.organizationId, orgDebts);
  }

  return {
    debtorUserId: options.debtorUserId,
    portfolios,
    debtsByOrg,
    allDebts,
    totalDebts: allDebts.length,
  };
}
