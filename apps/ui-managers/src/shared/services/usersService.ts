import { usersApiClient } from './apiClient.js';
import type {
  UserDetailDto,
  UserSummaryDto,
  PaginatedUsersResponseDto,
  ProfilesControllerListUsersParams,
  InviteUserDto,
  UpdateUserDto,
} from '../../api/generated/users_models/index.js';
import type { AxiosRequestConfig } from '@verichron/api-client';

export const usersService = {
  listUsers: async (
    organizationId: string,
    query?: ProfilesControllerListUsersParams,
    config?: AxiosRequestConfig
  ): Promise<PaginatedUsersResponseDto> => {
    const response = await usersApiClient.get<PaginatedUsersResponseDto>(
      `/v1/users/profiles/orgs/${organizationId}`,
      { params: query, ...config }
    );
    return response.data;
  },

  getUserById: async (
    organizationId: string,
    userId: string,
    config?: AxiosRequestConfig
  ): Promise<UserDetailDto> => {
    const response = await usersApiClient.get<UserDetailDto>(
      `/v1/users/profiles/orgs/${organizationId}/${userId}`,
      config
    );
    return response.data;
  },

  inviteUser: async (
    organizationId: string,
    data: InviteUserDto,
    config?: AxiosRequestConfig
  ): Promise<UserDetailDto> => {
    const response = await usersApiClient.post<UserDetailDto>(
      `/v1/users/profiles/orgs/${organizationId}`,
      data,
      config
    );
    return response.data;
  },

  updateUser: async (
    organizationId: string,
    userId: string,
    data: UpdateUserDto,
    config?: AxiosRequestConfig
  ): Promise<UserDetailDto> => {
    const response = await usersApiClient.patch<UserDetailDto>(
      `/v1/users/profiles/orgs/${organizationId}/${userId}`,
      data,
      config
    );
    return response.data;
  },

  deleteUser: async (
    organizationId: string,
    userId: string,
    config?: AxiosRequestConfig
  ): Promise<void> => {
    await usersApiClient.delete(`/v1/users/profiles/orgs/${organizationId}/${userId}`, config);
  },
};
