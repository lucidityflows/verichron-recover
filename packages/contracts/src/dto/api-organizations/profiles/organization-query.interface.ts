import { OrganizationType, OrganizationStatus, SortOrder } from "@verichron/enums";

export interface IOrganizationQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: OrganizationStatus;
  organizationType?: OrganizationType;
  name?: string;
  parentOrganizationId?: string;
  topLevelOnly?: boolean;
  sortBy?: string;
  sortOrder?: SortOrder;
}
