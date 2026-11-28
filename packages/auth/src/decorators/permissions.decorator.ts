import { SetMetadata } from '@nestjs/common';
import { OrganizationPermission, PlatformPermission } from '@verichron/enums';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: (OrganizationPermission | PlatformPermission | string)[]) => 
  SetMetadata(PERMISSIONS_KEY, permissions);
