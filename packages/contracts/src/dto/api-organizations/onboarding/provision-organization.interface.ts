import { ICreateOrganization } from '../profiles/create-organization.interface';
import { IInitialAdminUser } from './initial-admin-user.interface';

export interface IProvisionOrganization {
  organization: ICreateOrganization;
  initialAdmin: IInitialAdminUser;
  defaultSettings?: Record<string, any>;
  createdBy?: string;
}
