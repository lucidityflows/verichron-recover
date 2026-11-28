/**
 * Test Data: Organizations
 *
 * Creates test organizations for UI development and integration testing.
 */

import { DataSource } from 'typeorm';
import { OrganizationStatus } from '@verichron/enums';
import { log } from '../../helpers/logger';

export interface TestOrganization {
  id: string;
  name: string;
  displayName: string;
}

export async function seedTestOrganizations(
  orgsDataSource: DataSource
): Promise<{
  starkIndustries: TestOrganization;
  wayneEnterprises: TestOrganization;
}> {
  log('  🏢 Creating test organizations...', 'cyan');

  // Use raw queries to avoid importing entity classes

  // Stark Industries
  let stark = await orgsDataSource.query(
    `SELECT id, name, display_name FROM organizations WHERE name = $1`,
    ['Stark Industries']
  );

  if (!stark || stark.length === 0) {
    const result = await orgsDataSource.query(
      `INSERT INTO organizations (name, display_name, organization_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, name, display_name`,
      ['Stark Industries', 'Stark Industries', 'COLLECTION_AGENCY', OrganizationStatus.ACTIVE]
    );
    stark = result[0];
    log(`    ✅ Created: Stark Industries`, 'reset');
  } else {
    stark = stark[0];
  }

  // Wayne Enterprises
  let wayne = await orgsDataSource.query(
    `SELECT id, name, display_name FROM organizations WHERE name = $1`,
    ['Wayne Enterprises']
  );

  if (!wayne || wayne.length === 0) {
    const result = await orgsDataSource.query(
      `INSERT INTO organizations (name, display_name, organization_type, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, name, display_name`,
      ['Wayne Enterprises', 'Wayne Enterprises', 'COLLECTION_AGENCY', OrganizationStatus.ACTIVE]
    );
    wayne = result[0];
    log(`    ✅ Created: Wayne Enterprises`, 'reset');
  } else {
    wayne = wayne[0];
  }

  log('  ✅ Test organizations ready', 'green');

  return {
    starkIndustries: {
      id: stark.id,
      name: stark.name,
      displayName: stark.display_name || stark.name,
    },
    wayneEnterprises: {
      id: wayne.id,
      name: wayne.name,
      displayName: wayne.display_name || wayne.name,
    },
  };
}
