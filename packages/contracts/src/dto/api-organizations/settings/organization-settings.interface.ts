import { IOrganizationBrandingSettings } from './organization-branding-settings.interface';
import { IOrganizationComplianceSettings } from './organization-compliance-settings.interface';
import { IOrganizationBusinessRulesSettings } from './organization-business-rules-settings.interface';
import { IOrganizationCommunicationPreferencesSettings } from './organization-communication-preferences-settings.interface';
import { IOrganizationIntegrationsSettings } from './organization-integrations-settings.interface';
import { IOrganizationSecuritySettings } from './organization-security-settings.interface';

/**
 * Full organization settings structure interface
 */
export interface IOrganizationSettings {
  branding?: IOrganizationBrandingSettings;
  compliance?: IOrganizationComplianceSettings;
  businessRules?: IOrganizationBusinessRulesSettings;
  communicationPreferences?: IOrganizationCommunicationPreferencesSettings;
  integrations?: IOrganizationIntegrationsSettings;
  security?: IOrganizationSecuritySettings;
}
