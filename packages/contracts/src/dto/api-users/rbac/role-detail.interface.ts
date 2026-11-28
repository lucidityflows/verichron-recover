import { IRoleResponse } from './role-response.interface';
import { IPermissionResponse } from './permission-response.interface'; // Placeholder

export interface IRoleDetail extends IRoleResponse {
  permissions: IPermissionResponse[];
}
