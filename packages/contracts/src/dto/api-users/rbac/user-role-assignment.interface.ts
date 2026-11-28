import { IRoleResponse } from './role-response.interface';

export interface IUserRoleAssignment {
  userId: string;
  organizationId: string;
  role: IRoleResponse;
  assignedAt: Date;
  assignedBy?: string;
}
