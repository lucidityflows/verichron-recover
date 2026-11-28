import { usersApiClient } from './apiClient.js';
import type {
  AuthLoginDto,
  AuthTokenResponseDto,
  AuthTokenDto,
  AuthOrganizationListResponseDto,
} from '../../api/generated/users_models/index.js';

export const authService = {
  login: async (credentials: AuthLoginDto): Promise<AuthOrganizationListResponseDto> => {
    const response = await usersApiClient.post<AuthOrganizationListResponseDto>(
      '/public/users/auth/login',
      credentials
    );
    return response.data;
  },

  getToken: async (tokenRequest: AuthTokenDto): Promise<AuthTokenResponseDto> => {
    const response = await usersApiClient.post<AuthTokenResponseDto>(
      '/public/users/auth/token',
      tokenRequest
    );
    return response.data;
  },

  switchContext: async (): Promise<AuthOrganizationListResponseDto> => {
    const response = await usersApiClient.post<AuthOrganizationListResponseDto>(
      '/public/users/auth/switch-context',
      {}
    );
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthTokenResponseDto> => {
    const response = await usersApiClient.post<AuthTokenResponseDto>(
      '/public/users/auth/refresh',
      { refreshToken }
    );
    return response.data;
  },
};
