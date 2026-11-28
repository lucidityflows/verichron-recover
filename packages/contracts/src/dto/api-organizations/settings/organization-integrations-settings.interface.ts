export interface IIntegrationConfig {
  apiKey?: string;
  enabled?: boolean;
}

export interface IOrganizationIntegrationsSettings {
  stripe?: IIntegrationConfig;
  twilio?: IIntegrationConfig;
  sendgrid?: IIntegrationConfig;
}
