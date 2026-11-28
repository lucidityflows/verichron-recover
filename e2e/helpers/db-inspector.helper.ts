import { DataSource } from 'typeorm';
import { log } from './logger';

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: Date;
}

export interface MembershipRecord {
  id: string;
  userId: string;
  organizationId: string | null;
  organizationName: string | null;
  roleId: string;
  roleName?: string;
}

export interface RoleRecord {
  id: string;
  name: string;
  organizationId: string | null;
  isSystemRole: boolean;
  permissionCount?: number;
}

export interface OrganizationRecord {
  id: string;
  name: string;
  displayName: string | null;
  organizationType: string;
  status: string;
}

export interface DebtorRecord {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  organizationId: string;
}

export interface DebtRecord {
  id: string;
  debtorId: string;
  organizationId: string;
  portfolioId: string;
  principalAmount: string;
  status: string;
}

/**
 * Database Inspector Helper
 *
 * Provides comprehensive database inspection and verification tools
 * to objectively validate seeding and data integrity.
 */
export class DbInspector {
  constructor(private dataSource: DataSource, private dbName: string) {}

  /**
   * Get all users in the database
   */
  async getUsers(): Promise<UserRecord[]> {
    return this.dataSource.query(`
      SELECT
        id,
        email,
        first_name as "firstName",
        last_name as "lastName",
        status,
        created_at as "createdAt"
      FROM users
      ORDER BY email
    `);
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<UserRecord | null> {
    const users = await this.dataSource.query(
      `
      SELECT
        id,
        email,
        first_name as "firstName",
        last_name as "lastName",
        status,
        created_at as "createdAt"
      FROM users
      WHERE email = $1
    `,
      [email]
    );
    return users[0] || null;
  }

  /**
   * Get all memberships for a user
   */
  async getUserMemberships(userId: string): Promise<MembershipRecord[]> {
    return this.dataSource.query(
      `
      SELECT
        m.id,
        m.user_id as "userId",
        m.organization_id as "organizationId",
        m.organization_name as "organizationName",
        m.role_id as "roleId",
        r.name as "roleName"
      FROM user_memberships m
      JOIN roles r ON m.role_id = r.id
      WHERE m.user_id = $1
      ORDER BY m.organization_name NULLS FIRST
    `,
      [userId]
    );
  }

  /**
   * Get all roles
   */
  async getRoles(): Promise<RoleRecord[]> {
    return this.dataSource.query(`
      SELECT
        r.id,
        r.name,
        r.organization_id as "organizationId",
        r.is_system_role as "isSystemRole",
        COUNT(rp.permission_id) as "permissionCount"
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id, r.name, r.organization_id, r.is_system_role
      ORDER BY r.organization_id NULLS FIRST, r.name
    `);
  }

  /**
   * Get platform roles only
   */
  async getPlatformRoles(): Promise<RoleRecord[]> {
    return this.dataSource.query(`
      SELECT
        r.id,
        r.name,
        r.organization_id as "organizationId",
        r.is_system_role as "isSystemRole",
        COUNT(rp.permission_id) as "permissionCount"
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      WHERE r.organization_id IS NULL
      GROUP BY r.id, r.name, r.organization_id, r.is_system_role
      ORDER BY r.name
    `);
  }

  /**
   * Get all organizations
   */
  async getOrganizations(): Promise<OrganizationRecord[]> {
    return this.dataSource.query(`
      SELECT
        id,
        name,
        display_name as "displayName",
        organization_type as "organizationType",
        status
      FROM organizations
      ORDER BY name
    `);
  }

  /**
   * Get debtors
   */
  async getDebtors(): Promise<DebtorRecord[]> {
    return this.dataSource.query(`
      SELECT
        id,
        user_id as "userId",
        first_name as "firstName",
        last_name as "lastName",
        organization_id as "organizationId"
      FROM debtors
      ORDER BY first_name, last_name
    `);
  }

  /**
   * Get debts
   */
  async getDebts(): Promise<DebtRecord[]> {
    return this.dataSource.query(`
      SELECT
        id,
        debtor_id as "debtorId",
        organization_id as "organizationId",
        portfolio_id as "portfolioId",
        principal_amount as "principalAmount",
        status
      FROM debts
      ORDER BY created_at DESC
      LIMIT 100
    `);
  }

  /**
   * Get table counts
   */
  async getTableCounts(): Promise<Record<string, number>> {
    const tables = await this.dataSource.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN ('migrations', 'typeorm_metadata')
      ORDER BY tablename
    `);

    const counts: Record<string, number> = {};
    for (const { tablename } of tables) {
      const result = await this.dataSource.query(`SELECT COUNT(*) as count FROM "${tablename}"`);
      counts[tablename] = parseInt(result[0].count);
    }
    return counts;
  }

  /**
   * Verify user can login (has password hash)
   */
  async canUserLogin(email: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `SELECT password_hash FROM users WHERE email = $1`,
      [email]
    );
    return result.length > 0 && result[0].password_hash !== null;
  }

  /**
   * Print comprehensive database summary
   */
  async printDatabaseSummary(): Promise<void> {
    log(`\n📊 Database Summary: ${this.dbName}`, 'bright');
    log('═'.repeat(80), 'reset');

    // Table counts
    const counts = await this.getTableCounts();
    log('\n📋 Table Counts:', 'cyan');
    Object.entries(counts).forEach(([table, count]) => {
      const icon = count > 0 ? '✅' : '⚠️ ';
      log(`  ${icon} ${table.padEnd(30)} ${count}`, 'reset');
    });

    // Platform roles
    if (counts['roles']) {
      log('\n🎭 Platform Roles:', 'cyan');
      const platformRoles = await this.getPlatformRoles();
      platformRoles.forEach(role => {
        log(
          `  ✅ ${role.name.padEnd(20)} (${role.permissionCount} permissions)`,
          'reset'
        );
      });
    }

    // Users summary
    if (counts['users']) {
      log('\n👥 Users:', 'cyan');
      const users = await this.getUsers();
      for (const user of users) {
        const canLogin = await this.canUserLogin(user.email);
        const loginIcon = canLogin ? '🔐' : '❌';
        const memberships = await this.getUserMemberships(user.id);

        log(
          `  ${loginIcon} ${user.email.padEnd(40)} (${memberships.length} memberships)`,
          'reset'
        );

        memberships.forEach(m => {
          const orgDisplay = m.organizationName || 'PLATFORM';
          log(`      → ${m.roleName} in ${orgDisplay}`, 'reset');
        });
      }
    }

    // Organizations summary
    if (counts['organizations']) {
      log('\n🏢 Organizations:', 'cyan');
      const orgs = await this.getOrganizations();
      orgs.forEach(org => {
        log(
          `  ✅ ${org.name.padEnd(30)} (${org.status})`,
          'reset'
        );
      });
    }

    // Debtors and Debts summary
    if (counts['debtors']) {
      log('\n💳 Debtors:', 'cyan');
      const debtors = await this.getDebtors();
      log(`  Total: ${debtors.length} debtors`, 'reset');

      if (counts['debts']) {
        const debts = await this.getDebts();
        log(`  Total: ${debts.length} debts`, 'reset');
      }
    }

    log('\n' + '═'.repeat(80), 'reset');
  }

  /**
   * Verify expected test users exist
   */
  async verifyTestUsers(expectedUsers: string[]): Promise<{
    valid: boolean;
    missing: string[];
    issues: string[];
  }> {
    const issues: string[] = [];
    const missing: string[] = [];

    for (const email of expectedUsers) {
      const user = await this.getUserByEmail(email);
      if (!user) {
        missing.push(email);
        continue;
      }

      const canLogin = await this.canUserLogin(email);
      if (!canLogin) {
        issues.push(`${email} has no password hash`);
      }

      const memberships = await this.getUserMemberships(user.id);
      if (memberships.length === 0) {
        issues.push(`${email} has no memberships`);
      }
    }

    return {
      valid: missing.length === 0 && issues.length === 0,
      missing,
      issues,
    };
  }

  /**
   * Print verification report for test users
   */
  async printUserVerification(expectedUsers: string[]): Promise<boolean> {
    log('\n🔍 Verifying Test Users...', 'bright');
    log('═'.repeat(80), 'reset');

    const result = await this.verifyTestUsers(expectedUsers);

    if (result.valid) {
      log('✅ All expected users are properly configured!', 'green');
      return true;
    }

    if (result.missing.length > 0) {
      log('\n❌ Missing Users:', 'red');
      result.missing.forEach(email => {
        log(`  - ${email}`, 'red');
      });
    }

    if (result.issues.length > 0) {
      log('\n⚠️  User Configuration Issues:', 'yellow');
      result.issues.forEach(issue => {
        log(`  - ${issue}`, 'yellow');
      });
    }

    log('═'.repeat(80), 'reset');
    return false;
  }
}

/**
 * Create inspector for users database
 */
export function createUsersDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'users_db');
}

/**
 * Create inspector for organizations database
 */
export function createOrganizationsDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'organizations_db');
}

/**
 * Create inspector for debtors database
 */
export function createDebtorsDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'debtors_db');
}

/**
 * Create inspector for debts database
 */
export function createDebtsDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'debts_db');
}

/**
 * Create inspector for transactions database
 */
export function createTransactionsDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'transactions_db');
}

/**
 * Create inspector for communications database
 */
export function createCommunicationsDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'communications_db');
}

/**
 * Create inspector for collectors database
 */
export function createCollectorsDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'collectors_db');
}

/**
 * Create inspector for voice database
 */
export function createVoiceDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'voice_db');
}

/**
 * Create inspector for collectors database
 */
export function createWorkflowsDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'workflows_db');
}

/**
 * Create inspector for automations database
 */
export function createAutomationsDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'automations_db');
}

/**
 * Create inspector for analytics database
 */
export function createAnalyticsDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'analytics_db');
}

/**
 * Create inspector for audits database
 */
export function createAuditsDbInspector(dataSource: DataSource): DbInspector {
  return new DbInspector(dataSource, 'audits_db');
}