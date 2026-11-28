import { OrganizationStatus, OrganizationType } from '@verichron/enums';
import { DataSource } from 'typeorm';
import { faker } from '../../../utils/faker';

/**
 * Organization Factory
 * Creates organizations with relationships
 */

export interface CreateOrganizationOptions {
  id?: string;
  name?: string;
  displayName?: string;
  organizationType?: OrganizationType;
  parentOrganizationId?: string | null;
  taxId?: string;
  status?: OrganizationStatus;
  settings?: Record<string, any>;
  updatedBy?: string;
}

export interface Organization {
  id: string;
  name: string;
  displayName: string | null;
  organizationType: OrganizationType;
  parentOrganizationId: string | null;
  taxId: string | null;
  status: OrganizationStatus;
  settings: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string | null;
}

export class OrganizationFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Create an organization with default values
   */
  async createOrganization(options: CreateOrganizationOptions = {}): Promise<Organization> {
    const id = options.id || faker.uuid();
    const name = options.name || faker.company.name();
    const displayName = options.displayName || name;
    const organizationType = options.organizationType || OrganizationType.COLLECTION_AGENCY;
    const parentOrganizationId = options.parentOrganizationId === undefined ? null : options.parentOrganizationId;
    const taxId = options.taxId || null;
    const status = options.status || OrganizationStatus.PROVISIONING;
    const settings = options.settings || null;
    const updatedBy = options.updatedBy || null;

    const [organization] = await this.dataSource.query(
      `INSERT INTO organizations (id, name, display_name, organization_type, parent_organization_id, tax_id, status, settings, updated_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id, name, display_name as "displayName", organization_type as "organizationType", parent_organization_id as "parentOrganizationId", tax_id as "taxId", status, settings, created_at as "createdAt", updated_at as "updatedAt", updated_by as "updatedBy"`,
      [id, name, displayName, organizationType, parentOrganizationId, taxId, status, JSON.stringify(settings), updatedBy],
    );

    return organization;
  }

  /**
   * Create a collection agency organization
   */
  async createCollectionAgency(options: Partial<CreateOrganizationOptions> = {}): Promise<Organization> {
    return this.createOrganization({
      organizationType: OrganizationType.COLLECTION_AGENCY,
      status: options.status || OrganizationStatus.ACTIVE,
      ...options,
    });
  }

  /**
   * Create a creditor organization
   */
  async createCreditor(options: Partial<CreateOrganizationOptions> = {}): Promise<Organization> {
    return this.createOrganization({
      organizationType: OrganizationType.CREDITOR,
      status: options.status || OrganizationStatus.ACTIVE,
      ...options,
    });
  }

  /**
   * Create a child organization (sub-agency)
   */
  async createChildOrganization(
    parentOrganizationId: string,
    options: Partial<CreateOrganizationOptions> = {},
  ): Promise<Organization> {
    return this.createOrganization({
      parentOrganizationId,
      organizationType: options.organizationType || OrganizationType.COLLECTION_AGENCY,
      status: options.status || OrganizationStatus.ACTIVE,
      ...options,
    });
  }

  /**
   * Update organization settings
   */
  async updateSettings(organizationId: string, settings: Record<string, any>, updatedBy?: string): Promise<Organization> {
    const [organization] = await this.dataSource.query(
      `UPDATE organizations SET settings = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, display_name as "displayName", organization_type as "organizationType", parent_organization_id as "parentOrganizationId", tax_id as "taxId", status, settings, created_at as "createdAt", updated_at as "updatedAt", updated_by as "updatedBy"`,
      [JSON.stringify(settings), updatedBy || null, organizationId],
    );

    return organization;
  }

  /**
   * Update organization status
   */
  async updateStatus(
    organizationId: string,
    status: OrganizationStatus,
    updatedBy?: string,
  ): Promise<Organization> {
    const [organization] = await this.dataSource.query(
      `UPDATE organizations SET status = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, display_name as "displayName", organization_type as "organizationType", parent_organization_id as "parentOrganizationId", tax_id as "taxId", status, settings, created_at as "createdAt", updated_at as "updatedAt", updated_by as "updatedBy"`,
      [status, updatedBy || null, organizationId],
    );

    return organization;
  }

  /**
   * Find organization by ID
   */
  async findById(id: string): Promise<Organization | null> {
    const [organization] = await this.dataSource.query(
      `SELECT id, name, display_name as "displayName", organization_type as "organizationType", parent_organization_id as "parentOrganizationId", tax_id as "taxId", status, settings, created_at as "createdAt", updated_at as "updatedAt", updated_by as "updatedBy"
       FROM organizations WHERE id = $1`,
      [id],
    );
    return organization || null;
  }

  /**
   * Find organization by name
   */
  async findByName(name: string): Promise<Organization | null> {
    const [organization] = await this.dataSource.query(
      `SELECT id, name, display_name as "displayName", organization_type as "organizationType", parent_organization_id as "parentOrganizationId", tax_id as "taxId", status, settings, created_at as "createdAt", updated_at as "updatedAt", updated_by as "updatedBy"
       FROM organizations WHERE name = $1`,
      [name],
    );
    return organization || null;
  }

  /**
   * Get child organizations
   */
  async getChildren(parentOrganizationId: string): Promise<Organization[]> {
    return this.dataSource.query(
      `SELECT id, name, display_name as "displayName", organization_type as "organizationType", parent_organization_id as "parentOrganizationId", tax_id as "taxId", status, settings, created_at as "createdAt", updated_at as "updatedAt", updated_by as "updatedBy"
       FROM organizations WHERE parent_organization_id = $1 ORDER BY created_at ASC`,
      [parentOrganizationId],
    );
  }
}

/**
 * Factory creator function
 */
export function createOrganizationFactory(dataSource: DataSource): OrganizationFactory {
  return new OrganizationFactory(dataSource);
}
