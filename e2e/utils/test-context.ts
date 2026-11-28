import { DataSource } from 'typeorm';

/**
 * Test Context
 * Manages database connections and test lifecycle
 */

export interface TestContextConfig {
  userDbHost?: string;
  userDbPort?: number;
  userDbName?: string;
  userDbUsername?: string;
  userDbPassword?: string;

  orgDbHost?: string;
  orgDbPort?: number;
  orgDbName?: string;
  orgDbUsername?: string;
  orgDbPassword?: string;
}

export class TestContext {
  private userDataSource: DataSource | null = null;
  private orgDataSource: DataSource | null = null;
  private config: TestContextConfig;

  constructor(config: TestContextConfig = {}) {
    this.config = {
      userDbHost: config.userDbHost || process.env.USERS_DB_HOST || 'localhost',
      userDbPort: config.userDbPort || Number(process.env.USERS_DB_PORT) || 5433,
      userDbName: config.userDbName || process.env.USERS_DB_NAME || 'api_users_test',
      userDbUsername: config.userDbUsername || process.env.USERS_DB_USERNAME || 'postgres',
      userDbPassword: config.userDbPassword || process.env.USERS_DB_PASSWORD || 'postgres',

      orgDbHost: config.orgDbHost || process.env.ORG_DB_HOST || 'localhost',
      orgDbPort: config.orgDbPort || Number(process.env.ORG_DB_PORT) || 5434,
      orgDbName: config.orgDbName || process.env.ORG_DB_NAME || 'api_organizations_test',
      orgDbUsername: config.orgDbUsername || process.env.ORG_DB_USERNAME || 'postgres',
      orgDbPassword: config.orgDbPassword || process.env.ORG_DB_PASSWORD || 'postgres',
    };
  }

  /**
   * Initialize database connections
   */
  async initialize(): Promise<void> {
    // Initialize user database connection
    this.userDataSource = new DataSource({
      type: 'postgres',
      host: this.config.userDbHost,
      port: this.config.userDbPort,
      database: this.config.userDbName,
      username: this.config.userDbUsername,
      password: this.config.userDbPassword,
      synchronize: false,
      logging: false,
    });

    await this.userDataSource.initialize();

    // Initialize organization database connection
    this.orgDataSource = new DataSource({
      type: 'postgres',
      host: this.config.orgDbHost,
      port: this.config.orgDbPort,
      database: this.config.orgDbName,
      username: this.config.orgDbUsername,
      password: this.config.orgDbPassword,
      synchronize: false,
      logging: false,
    });

    await this.orgDataSource.initialize();
  }

  /**
   * Get user database connection
   */
  getUserDataSource(): DataSource {
    if (!this.userDataSource) {
      throw new Error('User DataSource not initialized. Call initialize() first.');
    }
    return this.userDataSource;
  }

  /**
   * Get organization database connection
   */
  getOrgDataSource(): DataSource {
    if (!this.orgDataSource) {
      throw new Error('Organization DataSource not initialized. Call initialize() first.');
    }
    return this.orgDataSource;
  }

  /**
   * Clean up test data from all databases
   */
  async cleanup(): Promise<void> {
    if (this.userDataSource?.isInitialized) {
      // Clean user database tables in reverse dependency order
      await this.userDataSource.query('TRUNCATE TABLE user_phones CASCADE');
      await this.userDataSource.query('TRUNCATE TABLE user_addresses CASCADE');
      await this.userDataSource.query('TRUNCATE TABLE user_emails CASCADE');
      await this.userDataSource.query('TRUNCATE TABLE user_memberships CASCADE');
      await this.userDataSource.query('TRUNCATE TABLE role_permissions CASCADE');
      await this.userDataSource.query('TRUNCATE TABLE permissions CASCADE');
      await this.userDataSource.query('TRUNCATE TABLE roles CASCADE');
      await this.userDataSource.query('TRUNCATE TABLE users CASCADE');
    }

    if (this.orgDataSource?.isInitialized) {
      // Clean organization database tables in reverse dependency order
      await this.orgDataSource.query('TRUNCATE TABLE organization_phone_numbers CASCADE');
      await this.orgDataSource.query('TRUNCATE TABLE organization_emails CASCADE');
      await this.orgDataSource.query('TRUNCATE TABLE organization_addresses CASCADE');
      await this.orgDataSource.query('TRUNCATE TABLE organizations CASCADE');
    }
  }

  /**
   * Close all database connections
   */
  async destroy(): Promise<void> {
    if (this.userDataSource?.isInitialized) {
      await this.userDataSource.destroy();
      this.userDataSource = null;
    }

    if (this.orgDataSource?.isInitialized) {
      await this.orgDataSource.destroy();
      this.orgDataSource = null;
    }
  }

  /**
   * Run a test with automatic setup and teardown
   */
  async runTest<T>(testFn: (context: TestContext) => Promise<T>): Promise<T> {
    try {
      await this.initialize();
      const result = await testFn(this);
      return result;
    } finally {
      await this.cleanup();
      await this.destroy();
    }
  }
}

/**
 * Create a new test context with default configuration
 */
export function createTestContext(config?: TestContextConfig): TestContext {
  return new TestContext(config);
}
