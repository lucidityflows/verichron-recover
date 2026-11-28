import {
  type AuthLoginDto,
  type AuthTokenResponseDto,
  type AuthTokenDto,
  type AuthOrganizationListResponseDto,
} from '../../api/generated/users_models/index.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { usersApiClient } from './apiClient.js';

export const authService = {
  login: async (credentials: AuthLoginDto, config?: AxiosRequestConfig): Promise<AuthOrganizationListResponseDto> => {
    const response = await usersApiClient.post<AuthOrganizationListResponseDto>('/public/users/auth/login', credentials, config);
    return response.data;
  },

  getToken: async (tokenRequest: AuthTokenDto, config?: AxiosRequestConfig): Promise<AuthTokenResponseDto> => {
    const response = await usersApiClient.post<AuthTokenResponseDto>('/public/users/auth/token', tokenRequest, config);
    return response.data;
  },

  switchContext: async (config?: AxiosRequestConfig): Promise<AuthOrganizationListResponseDto> => {
    const response = await usersApiClient.post<AuthOrganizationListResponseDto>('/public/users/auth/switch-context', {}, config);
    return response.data;
  },

  refreshToken: async (refreshToken: string, config?: AxiosRequestConfig): Promise<AuthTokenResponseDto> => {
    const response = await usersApiClient.post<AuthTokenResponseDto>('/public/users/auth/refresh', { refreshToken }, config);
    return response.data;
  },
};
