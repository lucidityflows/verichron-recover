import { useQuery } from '@tanstack/react-query';
import { useUser } from '../../../shared/store/userStore.js';
import { auditsControllerFindAll } from '../../../api/generated/audits/endpoints/audits/audits.js';
import { type AuditsControllerFindAllParams } from '../../../api/generated/audits_models/index.js';

export const useAuditLogs = (params: AuditsControllerFindAllParams = {}) => {
  const { organizationId } = useUser();

  return useQuery({
    queryKey: ['auditLogs', organizationId, params],
    queryFn: async () => {
      if (!organizationId) {
        throw new Error('Organization ID is required to fetch audit logs.');
      }
      const response = await auditsControllerFindAll(organizationId, params);
      return response.data;
    },
    enabled: !!organizationId,
    staleTime: 30000,
  });
};
