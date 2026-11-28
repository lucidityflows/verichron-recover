/**
 * Organization compliance settings interface
 */
export interface IOrganizationComplianceSettings {
  stateSpecificRulesEnabled?: string[];
  recordAllCalls?: boolean;
  fdcpaStrictMode?: boolean;
}
