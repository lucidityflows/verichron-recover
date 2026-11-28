/**
 * Published when organization settings are modified.
 * 
 * Consumers:
 * - Services that cache settings: Invalidate cache
 * - api-communications: Update behavior based on new preferences
 */
export interface OrganizationSettingsUpdatedPayload {
  organizationId: string;
  
  /**
   * Keys of settings that were updated.
   * Allows consumers to selectively react to specific changes.
   */
  updatedSettingKeys: string[];
  
  updatedBy: string;
}
