export interface IListRolesQuery {
  page?: number;
  limit?: number;
  search?: string;
  isSystemRole?: boolean;
  permissionId?: string;
}
