import { organizationsApiClient } from './apiClient.js';
import type { AxiosRequestConfig } from '@verichron/api-client';
import type { TeamMembershipMapResponseDto } from '../../api/generated/organizations_models/index.js';

export const teamsService = {
  getMembershipMap: async (
    organizationId: string,
    config?: AxiosRequestConfig
  ): Promise<TeamMembershipMapResponseDto> => {
    const response = await organizationsApiClient.get<TeamMembershipMapResponseDto>(
      `/v1/organizations/teams/orgs/${organizationId}/memberships`,
      config
    );
    return response.data;
  },
};
