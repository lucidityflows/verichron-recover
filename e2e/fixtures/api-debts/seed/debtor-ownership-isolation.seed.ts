import { DataSource } from 'typeorm';
import { createDebtFactory, createPortfolioFactory, type Debt, type DebtDebtor } from '../factories';

/**
 * Seed: Debtor Ownership Isolation Scenario
 *
 * Creates a test scenario where multiple debtors have debts in the same
 * organization/portfolio. This tests ownership-based access control:
 * TC-DBT-ACCESS-002: "Debtor Cannot Access Other Debtors' Debts"
 *
 * Scenario Setup:
 * - 1 organization with 1 portfolio
 * - 2 debtor users (Debtor A and Debtor B) in the same organization
 * - Debtor A has 3 debts
 * - Debtor B has 2 debts
 * - All debts in the same portfolio (testing ownership filtering, not org filtering)
 *
 * Expected Test Behavior:
 * - Debtor A GET /debts/my-debts returns ONLY their 3 debts
 * - Debtor B GET /debts/my-debts returns ONLY their 2 debts
 * - Debtor A GET /debts/{debtorBDebtId} returns 404 (ownership check fails)
 * - Query filters by: debtor_user_id = :userId (ownership-based)
 *
 * @example
 * ```typescript
 * const scenario = await seedDebtorOwnershipIsolation(debtsDataSource, {
 *   organizationId: org.id,
 *   debtorAUserId: debtorA.id,
 *   debtorBUserId: debtorB.id,
 * });
 *
 * expect(scenario.debtorADebts.length).toBe(3);
 * expect(scenario.debtorBDebts.length).toBe(2);
 *
 * // Test that debtor A cannot access debtor B's debt
 * const debtorBDebtId = scenario.debtorBDebts[0].debt.id;
 * const response = await apiClient.getDebt(debtorAToken, debtorBDebtId);
 * expect(response.status).toBe(404); // Ownership check fails
 * ```
 */

export interface SeedDebtorOwnershipIsolationOptions {
  organizationId: string;
  portfolioId?: string;
  debtorAUserId: string;
  debtorBUserId: string;
  debtorADebtCount?: number;
  debtorBDebtCount?: number;
}

export interface DebtorOwnershipIsolationScenario {
  organizationId: string;
  portfolio: any;
  debtorAUserId: string;
  debtorBUserId: string;
  debtorADebts: Array<{ debt: Debt; debtDebtor: DebtDebtor }>;
  debtorBDebts: Array<{ debt: Debt; debtDebtor: DebtDebtor }>;
  allDebts: Array<{ debt: Debt; debtDebtor: DebtDebtor }>;
}

export async function seedDebtorOwnershipIsolation(
  dataSource: DataSource,
  options: SeedDebtorOwnershipIsolationOptions,
): Promise<DebtorOwnershipIsolationScenario> {
  const debtFactory = createDebtFactory(dataSource);
  const portfolioFactory = createPortfolioFactory(dataSource);

  // Create or use provided portfolio
  const portfolio = options.portfolioId
    ? { id: options.portfolioId }
    : await portfolioFactory.createActivePortfolio({
        organizationId: options.organizationId,
        name: 'Ownership Test Portfolio',
      });

  const debtorADebtCount = options.debtorADebtCount || 3;
  const debtorBDebtCount = options.debtorBDebtCount || 2;

  // Create debts for Debtor A
  const debtorADebts: Array<{ debt: Debt; debtDebtor: DebtDebtor }> = [];
  for (let i = 0; i < debtorADebtCount; i++) {
    const result = await debtFactory.createDebtWithDebtor({
      organizationId: options.organizationId,
      portfolioId: portfolio.id,
      debtorId: options.debtorAUserId,
      principalAmount: (1000 + i * 500).toFixed(2),
      notes: `Debtor A - Debt ${i + 1}`,
    });
    debtorADebts.push(result);
  }

  // Create debts for Debtor B
  const debtorBDebts: Array<{ debt: Debt; debtDebtor: DebtDebtor }> = [];
  for (let i = 0; i < debtorBDebtCount; i++) {
    const result = await debtFactory.createDebtWithDebtor({
      organizationId: options.organizationId,
      portfolioId: portfolio.id,
      debtorId: options.debtorBUserId,
      principalAmount: (5000 + i * 1000).toFixed(2),
      notes: `Debtor B - Debt ${i + 1}`,
    });
    debtorBDebts.push(result);
  }

  return {
    organizationId: options.organizationId,
    portfolio,
    debtorAUserId: options.debtorAUserId,
    debtorBUserId: options.debtorBUserId,
    debtorADebts,
    debtorBDebts,
    allDebts: [...debtorADebts, ...debtorBDebts],
  };
}
