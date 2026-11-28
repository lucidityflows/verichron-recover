import {
  OrganizationSettingsResponseDto,
  UpdateOrganizationSettingsDto,
  ReplaceOrganizationSettingsDto
} from '../../api/generated/organizations_models/index.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
import {
  organizationsApiClient,
} from './apiClient.js';

export const settingsService = {
  getSettings: async (orgId: string, config?: AxiosRequestConfig): Promise<OrganizationSettingsResponseDto> => {
    const response = await organizationsApiClient.get<OrganizationSettingsResponseDto>(`/ops/organizations/settings/${orgId}`, config);
    return response.data;
  },
  updateSettings: async (orgId: string, dto: UpdateOrganizationSettingsDto, config?: AxiosRequestConfig): Promise<OrganizationSettingsResponseDto> => {
    const response = await organizationsApiClient.patch<OrganizationSettingsResponseDto>(`/ops/organizations/settings/${orgId}`, dto, config);
    return response.data;
  },
  replaceSettings: async (orgId: string, dto: ReplaceOrganizationSettingsDto, config?: AxiosRequestConfig): Promise<OrganizationSettingsResponseDto> => {
    const response = await organizationsApiClient.put<OrganizationSettingsResponseDto>(`/ops/organizations/settings/${orgId}`, dto, config);
    return response.data;
  },
};
