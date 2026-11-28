import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { OrganizationType } from '@verichron/enums';

export interface OrganizationData {
  id: string;
  name: string;
  displayName?: string;
  organizationType: OrganizationType;
  parentOrganizationId?: string;
  taxId?: string;
  status: string;
  settings?: Record<string, any>;
  updatedBy?: string;
}

export class OrganizationsFixture {
  constructor(private dataSource: DataSource) {}

  /**
   * Create a test organization
   */
  async create(overrides: Partial<OrganizationData> = {}): Promise<OrganizationData> {
    const orgData: OrganizationData = {
      id: faker.string.uuid(),
      name: faker.company.name(),
      displayName: faker.company.buzzPhrase(), // Default display name
          organizationType: OrganizationType.COLLECTION_AGENCY, // Default type, can be overridden
          status: 'ACTIVE',
      settings: {},
      ...overrides,
    };

    await this.dataSource.query(
      `INSERT INTO organizations (id, name, display_name, organization_type, parent_organization_id, tax_id, status, settings, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        orgData.id,
        orgData.name,
        orgData.displayName,
        orgData.organizationType,
        orgData.parentOrganizationId || null,
        orgData.taxId || null,
        orgData.status,
        JSON.stringify(orgData.settings),
        orgData.updatedBy || null,
      ]
    );

    return orgData;
  }

  /**
   * Create multiple test organizations
   */
  async createMany(count: number, overrides: Partial<OrganizationData> = {}): Promise<OrganizationData[]> {
    const promises = Array.from({ length: count }, () => this.create(overrides));
    return Promise.all(promises);
  }

  /**
   * Create organization with specific name
   */
  async createWithName(name: string, overrides: Partial<OrganizationData> = {}): Promise<OrganizationData> {
    return this.create({
      name,
      displayName: name, // Use name as display name by default
      organizationType: OrganizationType.COLLECTION_AGENCY, // Default type, can be overridden
      ...overrides,
    });
  }

  /**
   * Find organization by ID
   */
  async findById(id: string): Promise<OrganizationData | null> {
    const result = await this.dataSource.query(
      'SELECT * FROM organizations WHERE id = $1',
      [id]
    );

    return result[0] || null;
  }

  /**
   * Delete organization
   */
  async delete(id: string): Promise<void> {
    await this.dataSource.query('DELETE FROM organizations WHERE id = $1', [id]);
  }

  /**
   * Clean all organizations
   */
  async clean(): Promise<void> {
    await this.dataSource.query('TRUNCATE TABLE organizations CASCADE');
  }
}

/**
 * Factory function to create organizations fixture
 */
export function createOrganizationsFixture(dataSource: DataSource): OrganizationsFixture {
  return new OrganizationsFixture(dataSource);
}
