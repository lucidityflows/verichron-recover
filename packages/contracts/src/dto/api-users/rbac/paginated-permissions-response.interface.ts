import { IPermissionResponse } from './permission-response.interface';

export interface IPaginatedPermissionsResponse {
  data: IPermissionResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
