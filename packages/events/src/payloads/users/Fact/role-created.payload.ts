
/**
 * Payload for RoleCreated event
 */
export interface RoleCreatedPayload {
  roleId: string;
  organizationId: string | null;
  roleName: string;
  isSystemRole: boolean;
  permissionIds?: string[];
  createdBy?: string;
}

