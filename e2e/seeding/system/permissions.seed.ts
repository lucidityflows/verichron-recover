/**
 * System Seeding: Permissions
 *
 * Seeds platform-wide permissions.
 * This is system configuration, not test data.
 */

import { DataSource } from 'typeorm';
import { PLATFORM_PERMISSIONS } from '../../../apps/api-users/src/seeding/permissions.data';
import { log } from '../../helpers/logger';

export async function seedPermissions(usersDataSource: DataSource): Promise<void> {
  log('  🔐 Seeding permissions...', 'cyan');

  for (const permData of PLATFORM_PERMISSIONS) {
    const existing = await usersDataSource.query(
      `SELECT id FROM permissions WHERE code = $1`,
      [permData.code]
    );

    if (!existing || existing.length === 0) {
      await usersDataSource.query(
        `INSERT INTO permissions (code, description, resource, action, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [permData.code, permData.description, permData.resource, permData.action]
      );
      log(`    ✅ Created permission: ${permData.code}`, 'reset');
    }
  }

  log(`  ✅ ${PLATFORM_PERMISSIONS.length} permissions ready`, 'green');
}
