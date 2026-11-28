import { OrganizationType } from "@verichron/enums";

export interface IOrganizationBase {
  name: string;
  displayName?: string;
  organizationType: OrganizationType;
  parentOrganizationId?: string;
  taxId?: string;
}
