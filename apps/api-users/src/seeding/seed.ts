import 'reflect-metadata';
import dataSource from '../../datasource';
import { type DataSource, IsNull } from 'typeorm';
import { PermissionEntity } from '../rbac/entities/permission.entity';
import { RoleEntity } from '../rbac/entities/role.entity';
import { RolePermissionEntity } from '../rbac/entities/role-permission.entity';
import { PLATFORM_PERMISSIONS } from './permissions.data';
import { PLATFORM_ADMIN_ROLE_TEMPLATE } from '../rbac/role-templates';

export async function seedPermissions(ds: DataSource = dataSource) {

  const permissionRepository = ds.getRepository(PermissionEntity);

  console.log('\n🌱 Seeding permissions...\n');

  for (const permData of PLATFORM_PERMISSIONS) {
    const existing = await permissionRepository.findOne({
      where: { code: permData.code },
    });

    if (!existing) {
      await permissionRepository.save(permData);
      console.log(`  ✅ Created permission: ${permData.code}`);
    } else {
      console.log(`  ⏭️  Permission already exists: ${permData.code}`);
    }
  }

  console.log(`\n✅ Permissions seeding complete (${PLATFORM_PERMISSIONS.length} total)\n`);
}

export async function seedRoles(ds: DataSource = dataSource) {
  const roleRepository = ds.getRepository(RoleEntity);
  const permissionRepository = ds.getRepository(PermissionEntity);
  const rolePermissionRepository = ds.getRepository(RolePermissionEntity);

  console.log('\n🌱 Seeding platform role...\n');

  const { permissions, ...roleFields } = PLATFORM_ADMIN_ROLE_TEMPLATE;

  // Check if platform admin role exists
  const existing = await roleRepository.findOne({
    where: {
      name: PLATFORM_ADMIN_ROLE_TEMPLATE.name,
      organizationId: IsNull(),
    },
  });

  let role: RoleEntity;

  if (!existing) {
    role = await roleRepository.save({
      ...roleFields,
      organizationId: null,
    });
    console.log(`  ✅ Created platform role: ${PLATFORM_ADMIN_ROLE_TEMPLATE.name}`);
  } else {
    role = existing;
    console.log(`  ⏭️  Platform role already exists: ${PLATFORM_ADMIN_ROLE_TEMPLATE.name}`);
  }

  // Assign permissions to platform admin role (idempotent)
  for (const permCode of permissions) {
    const permission = await permissionRepository.findOne({
      where: { code: permCode },
    });

    if (!permission) {
      console.error(`  ❌ Permission not found: ${permCode} (skipping)`);
      continue;
    }

    const existingAssignment = await rolePermissionRepository.findOne({
      where: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });

    if (!existingAssignment) {
      await rolePermissionRepository.save({
        roleId: role.id,
        permissionId: permission.id,
      });
      console.log(`    ➕ Assigned permission: ${permCode} to ${PLATFORM_ADMIN_ROLE_TEMPLATE.name}`);
    }
  }

  console.log(`\n✅ Platform role seeding complete\n`);
}

// NOTE: Platform admin user creation removed from production seeding.
// This should be handled by:
// - E2E/test environments: e2e/seeding scripts
// - Production: Manual admin creation tool or separate onboarding process

async function main() {
  try {
    console.log('🚀 Starting api-users system configuration seeding...\n');
    console.log('   This seeds ONLY platform-level configuration:\n');
    console.log('   - Permissions');
    console.log('   - Platform Admin role\n');
    console.log('   For test data (users, orgs), use e2e seeding scripts.\n');

    await dataSource.initialize();
    console.log('📦 Database connection established\n');

    await seedPermissions();
    await seedRoles();

    console.log('🎉 System configuration seeding complete!\n');
    console.log('ℹ️  No users or organizations created.');
    console.log('   For testing, run: pnpm e2e setup && pnpm e2e ui-setup\n');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:\n', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}