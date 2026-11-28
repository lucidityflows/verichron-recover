import { IOrganizationSettings } from './organization-settings.interface';

/**
 * Update organization settings interface (HTTP PATCH)
 * Partial update - will be merged with existing settings
 */
export interface IUpdateOrganizationSettings {
  settings: IOrganizationSettings;
}
