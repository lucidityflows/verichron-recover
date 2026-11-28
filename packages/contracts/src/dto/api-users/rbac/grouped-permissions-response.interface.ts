import { IPermissionsByResource } from './permissions-by-resource.interface';

export interface IGroupedPermissionsResponse {
  groups: IPermissionsByResource[];
}
