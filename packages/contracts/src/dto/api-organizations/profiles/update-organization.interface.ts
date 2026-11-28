import { OrganizationType, OrganizationStatus } from "@verichron/enums";

export interface IUpdateOrganization {
  name?: string;
  displayName?: string;
  organizationType?: OrganizationType;
  parentOrganizationId?: string;
  taxId?: string;
  status?: OrganizationStatus;
  settings?: Record<string, any>;
}
