import { IPermissionResponse } from './permission-response.interface';

export interface IPermissionsByResource {
  resource: string;
  permissions: IPermissionResponse[];
}
