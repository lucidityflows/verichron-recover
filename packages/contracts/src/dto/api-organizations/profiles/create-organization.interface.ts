import { OrganizationType } from "@verichron/enums";

export interface ICreateOrganization {
  name: string;
  displayName?: string;
  organizationType: OrganizationType;
  parentOrganizationId?: string;
  taxId?: string;
  settings?: Record<string, any>;
}
