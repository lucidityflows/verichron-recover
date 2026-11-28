

/**
 * Payload for RoleDeleted event
 */
export interface RoleDeletedPayload {
  roleId: string;
  organizationId: string;
  roleName: string;
  deletedAt: string;
  deletedBy?: string;
}