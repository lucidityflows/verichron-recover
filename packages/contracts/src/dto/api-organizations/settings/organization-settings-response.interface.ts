/**
 * Organization settings response interface (HTTP GET)
 */
export interface IOrganizationSettingsResponse {
  orgId: string;
  settings: Record<string, any>;
  updatedBy: string | null;
  updatedAt: Date;
}
