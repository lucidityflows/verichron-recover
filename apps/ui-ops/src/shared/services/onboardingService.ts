import {
  ProvisionOrganizationDto,
  OnboardingResponseDto,
  OnboardingStatusResponseDto,
  ActivateOrganizationDto
} from '../../api/generated/organizations_models/index.js'; // Assuming generated types are here
import type { AxiosRequestConfig } from '@verichron/api-client';
import {
  organizationsApiClient,
} from './apiClient.js';

export const onboardingService = {
  provisionOrganization: async (dto: ProvisionOrganizationDto, config?: AxiosRequestConfig): Promise<OnboardingResponseDto> => {
    const response = await organizationsApiClient.post<OnboardingResponseDto>('/v1/organizations/onboarding', dto, config);
    return response.data;
  },
  getOnboardingStatus: async (orgId: string, config?: AxiosRequestConfig): Promise<OnboardingStatusResponseDto> => {
    const response = await organizationsApiClient.get<OnboardingStatusResponseDto>(`/v1/organizations/onboarding/${orgId}/status`, config);
    return response.data;
  },
  activateOrganizationInternal: async (dto: ActivateOrganizationDto, config?: AxiosRequestConfig): Promise<{ success: boolean }> => {
    const response = await organizationsApiClient.post<{ success: boolean }>('/internal/activate-organization', dto, config);
    return response.data;
  },
};
