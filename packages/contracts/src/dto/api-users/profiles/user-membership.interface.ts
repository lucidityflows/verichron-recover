import { IRoleResponse } from '../rbac'; // Placeholder, will define later

export interface IUserMembership {
  organizationId: string | null;
  organizationName: string | null;
  role: IRoleResponse; // Will need to define IRoleResponse
  joinedAt: Date;
}
