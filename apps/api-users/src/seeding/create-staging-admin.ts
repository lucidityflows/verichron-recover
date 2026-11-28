import 'reflect-metadata';
import dataSource from '../../datasource';
import * as bcrypt from 'bcrypt';
import { IsNull } from 'typeorm';
import { UserEntity } from '../profiles/entities/user.entity';
import { UserMembershipEntity } from '../profiles/entities/user-membership.entity';
import { RoleEntity } from '../rbac/entities/role.entity';
import { PLATFORM_ADMIN_ROLE_TEMPLATE } from '../rbac/role-templates';
import { UserStatus } from '@verichron/enums';
import { seedPermissions, seedRoles } from './seed';

// Configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'platform.admin@verichroninc.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const ADMIN_FIRST_NAME = 'Platform';
const ADMIN_LAST_NAME = 'Admin';

async function seedStagingAdmin() {
  console.log('🚀 Starting Staging Admin User Creation...\n');
  console.log(`Target Email: ${ADMIN_EMAIL}`);

  // 1. Initialize Database
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
    console.log('📦 Database connection established');
  }

  // 2. Ensure prerequisites (Permissions & Roles) exist
  console.log('\n--- Verifying System Prerequisites ---');
  await seedPermissions();
  await seedRoles();

  const userRepository = dataSource.getRepository(UserEntity);
  const membershipRepository = dataSource.getRepository(UserMembershipEntity);
  const roleRepository = dataSource.getRepository(RoleEntity);

  // 3. Check if user already exists
  const existingUser = await userRepository.findOne({
    where: { email: ADMIN_EMAIL },
  });

  if (existingUser) {
    console.log(`\n⚠️  User ${ADMIN_EMAIL} already exists. Skipping creation.`);
    await dataSource.destroy();
    return;
  }

  // 4. Get Platform Admin Role
  const platformRole = await roleRepository.findOne({
    where: {
      name: PLATFORM_ADMIN_ROLE_TEMPLATE.name,
      organizationId: IsNull(),
    },
  });

  if (!platformRole) {
    throw new Error('❌ Platform Admin Role not found after seeding! Something is wrong.');
  }

  // 5. Create User
  console.log('\n--- Creating Admin User ---');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

  const newUser = userRepository.create({
    email: ADMIN_EMAIL,
    firstName: ADMIN_FIRST_NAME,
    lastName: ADMIN_LAST_NAME,
    passwordHash: passwordHash,
    status: UserStatus.ACTIVE,
  });

  const savedUser = await userRepository.save(newUser);
  console.log(`✅ User created: ${savedUser.id}`);

  // 6. Assign Platform Admin Role
  const membership = membershipRepository.create({
    userId: savedUser.id,
    organizationId: null,
    organizationName: null,
    roleId: platformRole.id,
  });

  await membershipRepository.save(membership);
  console.log(`✅ Assigned role: ${PLATFORM_ADMIN_ROLE_TEMPLATE.name}`);

  console.log('\n🎉 Staging Admin User Created Successfully!');
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log('   Note: Please rotate this password immediately after login.\n');

  await dataSource.destroy();
}

if (require.main === module) {
  seedStagingAdmin().catch((error) => {
    console.error('\n❌ Admin creation failed:', error);
    process.exit(1);
  });
}
