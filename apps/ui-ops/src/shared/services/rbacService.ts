import { usersApiClient } from './apiClient.js';
import {
  CreateRoleDto,
  RoleDetailDto,
  RbacControllerListRolesParams,
  PaginatedRolesResponseDto,
  UpdateRoleDto,
  RbacControllerListPermissionsParams,
  PaginatedPermissionsResponseDto,
  GroupedPermissionsResponseDto,
  AssignPermissionToRoleDto,
  AssignPermissionsToRoleDto,
  AssignRoleToUserDto,
  RemoveRoleFromUserDto
} from '../../api/generated/users_models/index.js'; // Assuming generated types are here
// import {
//   CheckPermission,
//   PermissionCheckResult,
//   CheckPermissions,
//   PermissionsCheckResult
// } from '../../api/generated/models'; // Assuming generated types are here
import type { AxiosRequestConfig } from '@verichron/api-client';

export const rbacService = {
  createRole: async (orgId: string, roleData: CreateRoleDto, config?: AxiosRequestConfig): Promise<RoleDetailDto> => {
    const response = await usersApiClient.post<RoleDetailDto>(`/v1/users/rbac/orgs/${orgId}/roles`, roleData, config);
    return response.data;
  },
  listRoles: async (query?: RbacControllerListRolesParams, config?: AxiosRequestConfig): Promise<PaginatedRolesResponseDto> => {
    const response = await usersApiClient.get<PaginatedRolesResponseDto>('/ops/users/rbac/roles', { params: query, ...config });
    return response.data;
  },
  getRoleById: async (orgId: string, roleId: string, config?: AxiosRequestConfig): Promise<RoleDetailDto> => {
    const response = await usersApiClient.get<RoleDetailDto>(`/v1/users/rbac/orgs/${orgId}/roles/${roleId}`, config);
    return response.data;
  },
  updateRole: async (orgId: string, roleId: string, roleData: UpdateRoleDto, config?: AxiosRequestConfig): Promise<RoleDetailDto> => {
    const response = await usersApiClient.patch<RoleDetailDto>(`/v1/users/rbac/orgs/${orgId}/roles/${roleId}`, roleData, config);
    return response.data;
  },
  deleteRole: async (orgId: string, roleId: string, config?: AxiosRequestConfig): Promise<void> => {
    await usersApiClient.delete(`/v1/users/rbac/orgs/${orgId}/roles/${roleId}`, config);
  },
  listPermissions: async (query?: RbacControllerListPermissionsParams, config?: AxiosRequestConfig): Promise<PaginatedPermissionsResponseDto> => {
    const response = await usersApiClient.get<PaginatedPermissionsResponseDto>('/ops/users/rbac/permissions', { params: query, ...config });
    return response.data;
  },
  getGroupedPermissions: async (orgId: string, config?: AxiosRequestConfig): Promise<GroupedPermissionsResponseDto> => {
    const response = await usersApiClient.get<GroupedPermissionsResponseDto>(`/v1/users/rbac/orgs/${orgId}/permissions/grouped`, config);
    return response.data;
  },
  assignPermissionToRole: async (orgId: string, roleId: string, assignDto: AssignPermissionToRoleDto, config?: AxiosRequestConfig): Promise<void> => {
    await usersApiClient.post(`/v1/users/rbac/orgs/${orgId}/roles/${roleId}/permissions`, assignDto, config);
  },
  assignPermissionsToRoleBulk: async (orgId: string, roleId: string, assignDto: AssignPermissionsToRoleDto, config?: AxiosRequestConfig): Promise<void> => {
    await usersApiClient.post(`/v1/users/rbac/orgs/${orgId}/roles/${roleId}/permissions/bulk`, assignDto, config);
  },
  removePermissionFromRole: async (orgId: string, roleId: string, permissionId: string, config?: AxiosRequestConfig): Promise<void> => {
    await usersApiClient.delete(`/v1/users/rbac/orgs/${orgId}/roles/${roleId}/permissions/${permissionId}`, config);
  },
  assignRoleToUser: async (orgId: string, userId: string, assignDto: AssignRoleToUserDto, config?: AxiosRequestConfig): Promise<void> => {
    await usersApiClient.post(`/v1/users/rbac/orgs/${orgId}/users/${userId}/roles`, assignDto, config);
  },
  removeRoleFromUser: async (orgId: string, userId: string, roleId: string, removeDto: RemoveRoleFromUserDto, config?: AxiosRequestConfig): Promise<void> => {
    await usersApiClient.delete(`/v1/users/rbac/orgs/${orgId}/users/${userId}/roles/${roleId}`, { data: removeDto, ...config });
  },
};
