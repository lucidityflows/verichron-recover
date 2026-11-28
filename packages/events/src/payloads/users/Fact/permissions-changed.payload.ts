/**
 * Payload for PermissionsChanged event
 */
export interface PermissionsChangedPayload {
  roleId: string;
  organizationId: string;
  addedPermissions: string[];
  removedPermissions: string[];
  changedAt: string;
  changedBy?: string;
}