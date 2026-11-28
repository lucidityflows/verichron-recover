import { IOrganizationBase } from './organization-base.interface';
import { OrganizationStatus } from "@verichron/enums";

export interface IOrganizationResponse extends IOrganizationBase {
  id: string;
  status: OrganizationStatus;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
