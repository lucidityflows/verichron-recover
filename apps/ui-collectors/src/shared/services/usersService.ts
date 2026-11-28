/* eslint-disable @typescript-eslint/no-unused-vars */
import { usersApiClient } from './apiClient';
import type {
  UserDetailDto,
  UserSummaryDto,
  PaginatedUsersResponseDto,
  ProfilesControllerListUsersParams,
  InviteUserDto,
  UpdateUserDto,
} from '../../api/generated/users_models';
import type { AxiosRequestConfig } from '@verichron/api-client';

export const usersService = {
  listUsers: async (
    organizationId: string,
    query?: ProfilesControllerListUsersParams,
    config?: AxiosRequestConfig
  ): Promise<PaginatedUsersResponseDto> => {
    const response = await usersApiClient.get<PaginatedUsersResponseDto>(
      `/organizations/${organizationId}/users`,
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
      `/organizations/${organizationId}/users/${userId}`,
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
      `/organizations/${organizationId}/users`,
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
      `/organizations/${organizationId}/users/${userId}`,
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
    await usersApiClient.delete(`/organizations/${organizationId}/users/${userId}`, config);
  },
};
