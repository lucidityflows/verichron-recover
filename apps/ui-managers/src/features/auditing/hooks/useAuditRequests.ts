import { useQueryClient } from '@tanstack/react-query';
import {
  auditsControllerGetRequestArtifact,
  getAuditsControllerFindRequestsQueryKey,
  useAuditsControllerCreateRequest,
  useAuditsControllerFindRequestById,
  useAuditsControllerFindRequests,
} from '@/api/generated/audits/endpoints/audits/audits.js';
import type {
  AuditRequestResponseDto,
  AuditsControllerFindRequestsParams,
  CreateAuditRequestDto,
} from '@/api/generated/audits_models/index.js';
import { useUser } from '@/shared/store/userStore.js';

export type AuditRequestStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
export type CreateAuditRequestPayload = CreateAuditRequestDto;

export const useAuditRequests = (
  params: AuditsControllerFindRequestsParams = {},
  selectedRequestId?: string | null,
) => {
  const { organizationId } = useUser();
  const queryClient = useQueryClient();

  const listQuery = useAuditsControllerFindRequests(organizationId, params, {
    query: {
      enabled: !!organizationId,
      staleTime: 30_000,
      refetchInterval: (query) => {
        const rows = ((query.state.data as { data?: { data?: AuditRequestResponseDto[] } } | undefined)?.data?.data) ?? [];
        const hasRunningJobs = rows.some((row) => row.status === 'PENDING' || row.status === 'RUNNING');
        return hasRunningJobs ? 5000 : false;
      },
    },
  });

  const detailQuery = useAuditsControllerFindRequestById(
    organizationId,
    selectedRequestId ?? '',
    {
      query: {
        enabled: !!organizationId && !!selectedRequestId,
        refetchInterval: (query) => {
          const status = (
            query.state.data as { data?: AuditRequestResponseDto } | undefined
          )?.data?.status;
          return status === 'PENDING' || status === 'RUNNING' ? 5000 : false;
        },
      },
    },
  );

  const createMutation = useAuditsControllerCreateRequest({
    mutation: {
      onSuccess: async () => {
        if (!organizationId) {
          return;
        }
        await queryClient.invalidateQueries({
          queryKey: getAuditsControllerFindRequestsQueryKey(organizationId),
        });
      },
    },
  });

  const createAuditRequest = async (payload: CreateAuditRequestPayload) => {
    if (!organizationId) {
      throw new Error('Organization ID is required to create an audit request.');
    }
    const response = await createMutation.mutateAsync({
      organizationId,
      data: payload,
    });
    return response.data;
  };

  const downloadRequestArtifact = async (requestId: string) => {
    if (!organizationId) {
      throw new Error('Organization ID is required to download an audit artifact.');
    }
    const response = await auditsControllerGetRequestArtifact(organizationId, requestId);
    return response.data;
  };

  return {
    requests: listQuery.data?.data.data ?? [],
    pagination: listQuery.data?.data
      ? {
          total: listQuery.data.data.total,
          page: listQuery.data.data.page,
          pageSize: listQuery.data.data.pageSize,
          totalPages: listQuery.data.data.totalPages,
        }
      : null,
    isLoadingRequests: listQuery.isLoading,
    isRefetchingRequests: listQuery.isFetching,
    refetchRequests: listQuery.refetch,
    selectedRequest: detailQuery.data?.data ?? null,
    isLoadingSelectedRequest: detailQuery.isLoading,
    refetchSelectedRequest: detailQuery.refetch,
    createAuditRequest,
    isCreatingRequest: createMutation.isPending,
    downloadRequestArtifact,
  };
};
