
/**
 * Payload for RoleUpdated event
 */
export interface RoleUpdatedPayload {
  roleId: string;
  organizationId: string;
  updatedFields: string[];
  updatedAt: string;
  updatedBy?: string;
}
