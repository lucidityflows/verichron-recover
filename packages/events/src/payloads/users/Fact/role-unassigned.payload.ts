

/**
 * Payload for RoleUnassigned event
 */
export interface RoleUnassignedPayload {
  userId: string;
  roleId: string;
  organizationId: string;
  roleName: string;
  note?: string;
  unassignedAt: string;
  unassignedBy?: string;
}
