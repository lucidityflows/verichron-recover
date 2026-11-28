

/**
 * Payload for RoleAssigned event
 */
export interface RoleAssignedPayload {
  userId: string;
  roleId: string;
  organizationId: string;
  roleName: string;
  note?: string;
  assignedAt: string;
  assignedBy?: string;
}
