import { DataSource } from 'typeorm';
import { createUserFactory } from './api-users/factories/userFactory';

export interface PlatformAdminData {
  userId: string;
  email: string;
  password: string;
  roleId: string;
}

/**
 * Creates a platform administrator using the modern userFactory.
 * This replaces the legacy implementation that depended on multiple old fixture files.
 * The userFactory's `createPlatformAdmin` method handles role creation and membership internally.
 */
export async function createPlatformAdmin(
  usersDb: DataSource,
  overrides: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
  } = {},
): Promise<PlatformAdminData> {
  const userFactory = createUserFactory(usersDb);

  const admin = await userFactory.createPlatformAdmin(overrides);

  return {
    userId: admin.id,
    email: admin.email,
    password: admin.password,
    roleId: admin.roleId,
  };
}