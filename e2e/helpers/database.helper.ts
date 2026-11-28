import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import {
  API_USERS_ENTITIES,
  API_ORGANIZATIONS_ENTITIES,
  API_DEBTS_ENTITIES,
  API_DEBTORS_ENTITIES,
  API_TRANSACTIONS_ENTITIES,
  API_COMMUNICATIONS_ENTITIES,
  API_COLLECTORS_ENTITIES,
  API_VOICE_ENTITIES,
  API_WORKFLOWS_ENTITIES,
  API_AUTOMATIONS_ENTITIES,
  API_ANALYTICS_ENTITIES,
  API_AUDITS_ENTITIES,
} from './entity-registry';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export class DatabaseHelper {
  private dataSource: DataSource | null = null;

  constructor(private config: DatabaseConfig, private entities: any[] = []) {}

  /**
   * Create a connection to the database with retry logic
   */
  async connect(retries = 5, delay = 1000): Promise<DataSource> {
    if (this.dataSource?.isInitialized) {
      return this.dataSource;
    }

    this.dataSource = new DataSource({
      type: 'postgres',
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      password: this.config.password,
      database: this.config.database,
      entities: this.entities,
      synchronize: false,
      logging: false,
      extra: {
        max: 20, // Increase pool size for E2E churn
        idleTimeoutMillis: 1000,
        connectionTimeoutMillis: 5000,
      }
    });

    for (let i = 0; i < retries; i++) {
      try {
        await this.dataSource.initialize();
        return this.dataSource;
      } catch (error) {
        if (i === retries - 1) throw error;
        console.warn(`⚠️ Database connection attempt ${i + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Failed to connect to database after multiple attempts');
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.dataSource?.isInitialized) {
      await this.dataSource.destroy();
      this.dataSource = null;
    }
  }

  /**
   * Get the active data source
   */
  getDataSource(): DataSource {
    if (!this.dataSource?.isInitialized) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.dataSource;
  }

  /**
   * Clean all tables in the database (respects foreign key constraints)
   */
  async cleanAllTables(): Promise<void> {
    const dataSource = this.getDataSource();

    // Get all table names
    const tables = await dataSource.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN ('migrations', 'typeorm_metadata')
    `);

    if (tables.length === 0) {
      console.log('No tables to clean');
      return;
    }

    // Disable foreign key checks, truncate all tables, re-enable
    await dataSource.query('BEGIN');
    try {
      for (const { tablename } of tables) {
        await dataSource.query(`TRUNCATE TABLE "${tablename}" CASCADE`);
      }
      await dataSource.query('COMMIT');
      console.log(`✅ Cleaned ${tables.length} tables`);
    } catch (error) {
      await dataSource.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Drop all tables in the database
   */
  private async dropAllTables(): Promise<void> {
    const dataSource = this.getDataSource();
    const tables = await dataSource.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT IN ('migrations', 'typeorm_metadata')
    `);

    if (tables.length === 0) {
      return;
    }

    await dataSource.query('BEGIN');
    try {
      for (const { tablename } of tables) {
        await dataSource.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
      }
      await dataSource.query('COMMIT');
      console.log(`✅ Dropped ${tables.length} tables`);
    } catch (error) {
      await dataSource.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Clean specific tables
   */
  async cleanTables(tableNames: string[]): Promise<void> {
    const dataSource = this.getDataSource();

    await dataSource.query('BEGIN');
    try {
      for (const tableName of tableNames) {
        await dataSource.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
      }
      await dataSource.query('COMMIT');
      console.log(`✅ Cleaned tables: ${tableNames.join(', ')}`);
    } catch (error) {
      await dataSource.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Run raw SQL query
   */
  async query(sql: string, parameters?: any[]): Promise<any> {
    const dataSource = this.getDataSource();
    return dataSource.query(sql, parameters);
  }

  /**
   * Check if database is reachable
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.connect();
      await this.dataSource!.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Reset database to clean state (drop and recreate)
   * WARNING: This is destructive!
   */
  async resetDatabase(): Promise<void> {
    console.log('⚠️  Resetting database (this will drop all data)...');

    // Connect to postgres database to drop and recreate test database
    const postgresDataSource = new DataSource({
      type: 'postgres',
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      password: this.config.password,
      database: 'postgres', // Connect to default postgres database
    });

    await postgresDataSource.initialize();

    try {
      // Terminate all connections to the test database
      await postgresDataSource.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${this.config.database}'
        AND pid <> pg_backend_pid()
      `);

      // Drop and recreate database
      await postgresDataSource.query(`DROP DATABASE IF EXISTS "${this.config.database}"`);
      await postgresDataSource.query(`CREATE DATABASE "${this.config.database}"`);

      console.log('✅ Database reset complete');
    } finally {
      await postgresDataSource.destroy();
    }

    // Reconnect to the new database
    if (this.dataSource?.isInitialized) {
      await this.disconnect();
    }
    await this.connect();
  }

/**
   * Initialize schema for api-users service
   */
  async initializeUsersSchema(): Promise<void> {
    await this.resetDatabase(); // ADD THIS LINE
    const dataSource = this.getDataSource();
    console.log(`📋 Initializing schema for users_db...`);
    console.log(`DEBUG: Running CREATE TABLE for roles with nullable organization_id`); // ADD THIS LOG

    await dataSource.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Only users-related tables
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        first_name VARCHAR(255) NOT NULL,
        middle_name VARCHAR(255),
        last_name VARCHAR(255) NOT NULL,
        suffix VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR,
        status VARCHAR(50) DEFAULT 'PENDING',
        invitation_token VARCHAR,
        invitation_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code VARCHAR(100) UNIQUE NOT NULL,
        description VARCHAR(500),
        resource VARCHAR(50),
        action VARCHAR(50),
        scope VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id UUID,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(500),
        is_system_role BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (organization_id, name)
      -- Check constraint: NULL org_id only for system roles
      CONSTRAINT chk_platform_role_no_org
      CHECK (
        (organization_id IS NULL AND is_system_role = true) OR
        (organization_id IS NOT NULL)
      )
    `);

    console.log(`DEBUG: Running CREATE TABLE for user_memberships with nullable organization_id`); // ADD THIS LOG
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS user_memberships (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- New primary key
        user_id UUID NOT NULL,
        organization_id UUID, -- Nullable
        organization_name VARCHAR(255),
        role_id UUID NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      -- Check constraint: org_id and org_name both NULL or both NOT NULL
      CONSTRAINT chk_platform_membership_no_org
      CHECK (
        (organization_id IS NULL AND organization_name IS NULL) OR
        (organization_id IS NOT NULL AND organization_name IS NOT NULL)
      )
    `);

    await dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memberships_org_unique
      ON user_memberships (user_id, organization_id)
      WHERE organization_id IS NOT NULL;
    `);

    await dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_memberships_platform_unique
      ON user_memberships (user_id)
      WHERE organization_id IS NULL;
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        street1 VARCHAR(255),
        street2 VARCHAR(255),
        city VARCHAR(255),
        state VARCHAR(255),
        postal_code VARCHAR(50),
        country VARCHAR(255),
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS user_emails (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        email VARCHAR(255) NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS user_phone_numbers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        is_primary BOOLEAN DEFAULT false,
        phone_number VARCHAR(50),
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id UUID NOT NULL,
        permission_id UUID NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      )
    `);

  // ✅ Create indexes including platform-specific ones
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_user_memberships_user ON user_memberships(user_id)`);
  await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code)`);
  
  // ✅ Partial indexes for organization-scoped roles
  await dataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_org_name_unique 
    ON roles (organization_id, name) 
    WHERE organization_id IS NOT NULL
  `);
  
  // ✅ Partial index for platform roles (unique name when no org)
  await dataSource.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_platform_name_unique 
    ON roles (name) 
    WHERE organization_id IS NULL
  `);
  
  // ✅ Index for finding platform roles
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_roles_platform 
    ON roles (is_system_role) 
    WHERE organization_id IS NULL
  `);
  
  // ✅ Index for finding platform memberships
  await dataSource.query(`
    CREATE INDEX IF NOT EXISTS idx_memberships_platform 
    ON user_memberships (user_id) 
    WHERE organization_id IS NULL
  `);

  console.log('✅ Users database schema initialized (with nullable organization_id)');
  }

  /**
   * Initialize schema for api-organizations service
   */
  async initializeOrganizationsSchema(): Promise<void> {
    await this.resetDatabase(); // ADD THIS LINE
    const dataSource = this.getDataSource();
    console.log(`📋 Initializing schema for organizations_db...`);

    await dataSource.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Only organizations-related tables
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS organizations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      display_name VARCHAR(255),
      organization_type VARCHAR(50) NOT NULL CHECK (organization_type IN ('COLLECTION_AGENCY', 'CREDITOR', 'PARTNER')),
      parent_organization_id UUID,
      tax_id VARCHAR(50),
      status VARCHAR(50) NOT NULL DEFAULT 'PROVISIONING' CHECK (status IN ('PROVISIONING', 'ACTIVE', 'INACTIVE', 'SUSPENDED')),
      settings JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_by UUID,
      
      CONSTRAINT fk_parent_organization 
        FOREIGN KEY (parent_organization_id) 
        REFERENCES organizations(id) 
        ON DELETE SET NULL
      )
    `);

    // Create indexes matching the TypeORM entity decorators
    await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);`);
    await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(organization_type);`);
    await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);`);
    await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_organization_id);`)
    await dataSource.query(`CREATE INDEX IF NOT EXISTS idx_organizations_updated_by ON organizations(updated_by);`)

    // COMMENT ON TABLE organizations IS 'Organization entity representing a tenant in the SaaS platform. Can be a debt collection agency, creditor, or partner organization.';

    // Add other organizations-specific tables here

    console.log('✅ Organizations database schema initialized');
  }


  /**
   * Initialize schema from TypeORM entities (automatic schema generation)
   * This replaces hardcoded SQL schemas with TypeORM synchronization
   *
   * @param entities - Array of TypeORM entity classes
   * @example
   * ```typescript
   * import { API_USERS_ENTITIES } from './entity-registry';
   * await dbHelper.initializeSchemaFromEntities(API_USERS_ENTITIES);
   * ```
   */
  async initializeSchemaFromEntities(entities: any[]): Promise<void> {
    console.log(`📋 Initializing schema for \"${this.config.database}\" from ${entities.length} TypeORM entities...`);

    // Disconnect existing connection if any
    if (this.dataSource?.isInitialized) {
      await this.disconnect();
    }

    // Create new DataSource with entities and auto-synchronization.
    // dropSchema: true will wipe all tables on connection, ensuring a clean state.
    this.dataSource = new DataSource({
      type: 'postgres',
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      password: this.config.password,
      database: this.config.database,
      entities: entities,
      synchronize: true,
      dropSchema: true, // Recreates schema on every connection
      logging: false,
    });

    // Initialize connection (TypeORM will create all tables)
    await this.dataSource.initialize();

    console.log(`✅ Schema for \"${this.config.database}\" initialized from TypeORM entities`);
  }

  /**
   * Run migrations for a specific service
   */
  async runMigrations(migrationsPath: string): Promise<void> {
    // This would need to be implemented based on your migration strategy
    console.log(`Running migrations from ${migrationsPath}...`);
    // You might use TypeORM migrations here or a custom script
  }

  /**
   * Seed test data
   */
  async seedData(seedFn: (dataSource: DataSource) => Promise<void>): Promise<void> {
    const dataSource = this.getDataSource();
    await seedFn(dataSource);
    console.log('✅ Test data seeded');
  }
}

/**
 * Create helpers for each database
 */
export function createUsersDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'users_db',
  }, API_USERS_ENTITIES);
}

export function createOrganizationsDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'organizations_db',
  }, API_ORGANIZATIONS_ENTITIES);
}

/**
 * Create a database helper for the test database
 */
export function createTestDatabaseHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'debt_collection_test',
  });
}

export function createDebtsDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'debts_db',
  }, API_DEBTS_ENTITIES);
}

export function createDebtorsDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'debtors_db',
  }, API_DEBTORS_ENTITIES);
}

export function createTransactionsDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'transactions_db',
  }, API_TRANSACTIONS_ENTITIES);
}

export function createCommunicationsDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'communications_db',
  }, API_COMMUNICATIONS_ENTITIES);
}

export function createCollectorsDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'collectors_db',
  }, API_COLLECTORS_ENTITIES);
}

export function createVoiceDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'voice_db',
  }, API_VOICE_ENTITIES);
}

export function createWorkflowsDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'workflows_db',
  }, API_WORKFLOWS_ENTITIES);
}

export function createAutomationsDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'automations_db', // No actual DB, but defined for consistency
  }, API_AUTOMATIONS_ENTITIES);
}

export function createAnalyticsDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'analytics_db',
  }, API_ANALYTICS_ENTITIES);
}

export function createAuditsDbHelper(): DatabaseHelper {
  return new DatabaseHelper({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: 'audits_db',
  }, API_AUDITS_ENTITIES);
}
