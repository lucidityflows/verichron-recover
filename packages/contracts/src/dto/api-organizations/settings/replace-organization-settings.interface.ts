import { IOrganizationSettings } from './organization-settings.interface';

/**
 * Replace organization settings interface (HTTP PUT)
 * Full replacement - all existing settings will be replaced
 */
export interface IReplaceOrganizationSettings {
  settings: IOrganizationSettings;
}
