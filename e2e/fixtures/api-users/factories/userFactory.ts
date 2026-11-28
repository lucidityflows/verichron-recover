import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { faker } from '../../../utils/faker';
import { UserStatus } from '@verichron/enums';

/**
 * User Factory
 * Creates users with organization relationships
 */

export interface CreateUserOptions {
  id?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
  organizationId?: string | null;
  organizationName?: string;
  roleId?: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  passwordHash: string;
  organizationId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class UserFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Create a user with default values
   */
  async createUser(options: CreateUserOptions = {}): Promise<User & { password: string }> {
    const id = options.id || faker.uuid();
    const email = options.email || faker.email('user');
    const password = options.password || faker.password('User');
    const firstName = options.firstName || faker.person.firstName();
    const lastName = options.lastName || faker.person.lastName();
    const status = options.status || 'ACTIVE';
    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await this.dataSource.query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, email, first_name as "firstName", last_name as "lastName", status, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"`,
      [id, email, passwordHash, firstName, lastName, status],
    );

    // Create membership if organizationId and roleId provided
    if (options.organizationId !== undefined && options.roleId) {
      await this.dataSource.query(
        `INSERT INTO user_memberships (user_id, organization_id, organization_name, role_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [id, options.organizationId, options.organizationName, options.roleId],
      );
    }

    return { ...user, password };
  }

  /**
   * Create a platform admin user (no organization)
   */
  async createPlatformAdmin(options: Partial<CreateUserOptions> = {}): Promise<User & { password: string; roleId: string }> {
    // Get or create platform admin role
    const roleId = await this.ensurePlatformAdminRole();

    const user = await this.createUser({
      email: options.email || 'platform.admin@test.com',
      password: options.password || 'PlatformAdmin123!',
      firstName: options.firstName || 'Platform',
      lastName: options.lastName || 'Admin',
      status: UserStatus.ACTIVE,
      organizationId: null, // Platform admins have no org
      roleId,
      ...options,
    });

    return { ...user, roleId };
  }

  /**
   * Create organization admin user
   */
  async createOrgAdmin(
    organizationId: string,
    organizationName: string,
    roleId: string,
    options: Partial<CreateUserOptions> = {}
  ): Promise<User & { password: string }> {
    return this.createUser({
      email: options.email || faker.email('admin'),
      password: options.password || faker.password('Admin'),
      firstName: options.firstName || faker.person.firstName(),
      lastName: options.lastName || faker.person.lastName(),
      status: UserStatus.ACTIVE,
      organizationId,
      organizationName,
      roleId,
      ...options,
    });
  }

  /**
   * Create regular organization user
   */
  async createOrgUser(
    organizationId: string,
    organizationName: string,
    roleId: string,
    options: Partial<CreateUserOptions> = {}
  ): Promise<User & { password: string }> {
    return this.createUser({
      organizationId,
      organizationName,
      roleId,
      status: options.status || UserStatus.ACTIVE,
      ...options,
    });
  }

  /**
   * Create pending user (invited, not activated)
   */
  async createPendingUser(
    organizationId: string,
    roleId: string,
    options: Partial<CreateUserOptions> = {}
  ): Promise<User & { password: string; invitationToken: string }> {
    const invitationToken = faker.uuid();

    const user = await this.createUser({
      organizationId,
      roleId,
      status: UserStatus.PENDING,
      ...options,
    });

    // Add invitation token
    await this.dataSource.query(
      `UPDATE users SET invitation_token = $1, invitation_expires_at = NOW() + INTERVAL '7 days' WHERE id = $2`,
      [invitationToken, user.id],
    );

    return { ...user, invitationToken };
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const [user] = await this.dataSource.query(
      `SELECT id, email, first_name as "firstName", last_name as "lastName", status, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE email = $1`,
      [email],
    );
    return user || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const [user] = await this.dataSource.query(
      `SELECT id, email, first_name as "firstName", last_name as "lastName", status, password_hash as "passwordHash", created_at as "createdAt", updated_at as "updatedAt"
       FROM users WHERE id = $1`,
      [id],
    );
    return user || null;
  }

  /**
   * Get user memberships
   */
  async getMemberships(userId: string): Promise<Array<{ organizationId: string | null; roleId: string; organizationName: string | null }>> {
    return this.dataSource.query(
      `SELECT organization_id as "organizationId", role_id as "roleId", organization_name as "organizationName" FROM user_memberships WHERE user_id = $1`,
      [userId],
    );
  }

  /**
   * Helper: Get platform admin role (must be created by seeding first)
   */
  private async ensurePlatformAdminRole(): Promise<string> {
    const [existingRole] = await this.dataSource.query(
      `SELECT id FROM roles WHERE name = 'PLATFORM_ADMIN' AND organization_id IS NULL LIMIT 1`,
    );

    if (!existingRole) {
      throw new Error(
        'PLATFORM_ADMIN role not found! Run database seeding first: pnpm --filter @verichron/api-users seed'
      );
    }

    return existingRole.id;
  }
}

/**
 * Factory creator function
 */
export function createUserFactory(dataSource: DataSource): UserFactory {
  return new UserFactory(dataSource);
}
