import { DataSource } from 'typeorm';
import { log } from '../../helpers/logger';
import { ApprovalThreshold, AuthorityRoleType } from '../../../apps/api-organizations/src/strategy/entities/approval-threshold.entity';
import { SettlementAuthorityMatrix } from '../../../apps/api-organizations/src/strategy/entities/settlement-authority-matrix.entity';

interface OrgInfo {
  id: string;
  name: string;
}

/**
 * Seeds approval thresholds (authority ladder) for each organization
 */
export async function seedStrategy(
  orgsDataSource: DataSource,
  organizations: OrgInfo[]
) {
  const approvalThresholdRepo = orgsDataSource.getRepository(ApprovalThreshold);
  const authorityMatrixRepo = orgsDataSource.getRepository(SettlementAuthorityMatrix);

  for (const org of organizations) {
    log(`  -> Seeding strategy config for ${org.name}...`, 'reset');

    // ========================================================================
    // Approval Thresholds (Authority Ladder)
    // ========================================================================
    const thresholds = [
      {
        organizationId: org.id,
        roleType: AuthorityRoleType.COLLECTOR,
        maxDiscountPercent: 30.00,
        maxDollarAmount: 5000.00,
        maxPlanDurationMonths: 12,
        minDownPaymentPercent: 15.00,
      },
      {
        organizationId: org.id,
        roleType: AuthorityRoleType.TEAM_LEAD,
        maxDiscountPercent: 50.00,
        maxDollarAmount: 15000.00,
        maxPlanDurationMonths: 24,
        minDownPaymentPercent: 10.00,
      },
      {
        organizationId: org.id,
        roleType: AuthorityRoleType.MANAGER,
        maxDiscountPercent: 75.00,
        maxDollarAmount: undefined, // No dollar cap for managers
        maxPlanDurationMonths: 48,
        minDownPaymentPercent: 5.00,
      },
    ];

    for (const threshold of thresholds) {
      await approvalThresholdRepo.upsert(threshold, {
        conflictPaths: ['organizationId', 'roleType'],
        skipUpdateIfNoValuesChanged: true,
      });
    }

    // ========================================================================
    // Settlement Authority Matrix (Balance & Age Tiers)
    // ========================================================================
    const matrices = [
      // Low balance, recent debts: Lower discount allowed
      {
        organizationId: org.id,
        minBalance: 0,
        maxBalance: 1000,
        minAgeDays: 0,
        maxAgeDays: 90,
        maxDiscountPercent: 15.00,
      },
      {
        organizationId: org.id,
        minBalance: 0,
        maxBalance: 1000,
        minAgeDays: 91,
        maxAgeDays: 180,
        maxDiscountPercent: 25.00,
      },
      {
        organizationId: org.id,
        minBalance: 0,
        maxBalance: 1000,
        minAgeDays: 181,
        maxAgeDays: undefined, // 180+ days
        maxDiscountPercent: 35.00,
      },

      // Medium balance ($1K-$5K)
      {
        organizationId: org.id,
        minBalance: 1000,
        maxBalance: 5000,
        minAgeDays: 0,
        maxAgeDays: 90,
        maxDiscountPercent: 20.00,
      },
      {
        organizationId: org.id,
        minBalance: 1000,
        maxBalance: 5000,
        minAgeDays: 91,
        maxAgeDays: 180,
        maxDiscountPercent: 30.00,
      },
      {
        organizationId: org.id,
        minBalance: 1000,
        maxBalance: 5000,
        minAgeDays: 181,
        maxAgeDays: undefined,
        maxDiscountPercent: 45.00,
      },

      // High balance ($5K+)
      {
        organizationId: org.id,
        minBalance: 5000,
        maxBalance: undefined, // No upper limit
        minAgeDays: 0,
        maxAgeDays: 90,
        maxDiscountPercent: 25.00,
      },
      {
        organizationId: org.id,
        minBalance: 5000,
        maxBalance: undefined,
        minAgeDays: 91,
        maxAgeDays: 180,
        maxDiscountPercent: 40.00,
      },
      {
        organizationId: org.id,
        minBalance: 5000,
        maxBalance: undefined,
        minAgeDays: 181,
        maxAgeDays: undefined,
        maxDiscountPercent: 60.00,
      },
    ];

    for (const matrix of matrices) {
      await authorityMatrixRepo.save(matrix);
    }

    log(`  ✅ Strategy config for ${org.name} complete`, 'green');
  }

  log('  -> Strategy seeding complete', 'green');
}
