import { usersApiClient } from './apiClient';
import type {
  AuthLoginDto,
  AuthTokenResponseDto,
  AuthTokenDto,
  AuthOrganizationListResponseDto,
} from '../../api/generated/users_models';

export const authService = {
  login: async (credentials: AuthLoginDto): Promise<AuthOrganizationListResponseDto> => {
    const response = await usersApiClient.post<AuthOrganizationListResponseDto>(
      '/auth/login',
      credentials
    );
    return response.data;
  },

  getToken: async (tokenRequest: AuthTokenDto): Promise<AuthTokenResponseDto> => {
    const response = await usersApiClient.post<AuthTokenResponseDto>(
      '/auth/token',
      tokenRequest
    );
    return response.data;
  },

  switchContext: async (): Promise<AuthOrganizationListResponseDto> => {
    const response = await usersApiClient.post<AuthOrganizationListResponseDto>(
      '/auth/switch-context',
      {}
    );
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthTokenResponseDto> => {
    const response = await usersApiClient.post<AuthTokenResponseDto>(
      '/auth/refresh',
      { refreshToken }
    );
    return response.data;
  },
};
