import { IRoleResponse } from './role-response.interface';

export interface IPaginatedRolesResponse {
  data: IRoleResponse[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
