import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../../shared/store/userStore.js';
import { 
  importsControllerFindAll, 
  importsControllerCreate,
  importsControllerFindOne,
  importsControllerInspect
} from '../../../api/generated/debts/endpoints/portfolio-ingestion/portfolio-ingestion.js';
import { type ImportsControllerFindAllParams, type ImportsControllerCreateBody } from '../../../api/generated/debts_models/index.js';

export const useImportJobs = (params?: ImportsControllerFindAllParams) => {
  const { organizationId } = useUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['importJobs', organizationId, params],
    queryFn: () => importsControllerFindAll(organizationId!, params),
    enabled: !!organizationId,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data: ImportsControllerCreateBody) =>
      importsControllerCreate(organizationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['importJobs', organizationId] });
    },
  });

  const inspectMutation = useMutation<
    Awaited<ReturnType<typeof importsControllerInspect>>,
    unknown,
    File
  >({
    mutationFn: (file: File) => {
      console.log('[useImportJobs] File object:', file);
      console.log('[useImportJobs] File size:', file.size);
      console.log('[useImportJobs] File name:', file.name);
      console.log('[useImportJobs] File type:', file.type);
      return importsControllerInspect(organizationId!, { file });
    },
  });

  return {
    jobs: query.data?.data.data || [],
    total: query.data?.data.meta.total || 0,
    isLoading: query.isLoading,
    createImport: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    inspectImport: inspectMutation.mutateAsync,
    isInspecting: inspectMutation.isPending,
  };
};

export const useImportJobStatus = (id: string) => {
  const { organizationId } = useUser();
  return useQuery({
    queryKey: ['importJob', organizationId, id],
    queryFn: () => importsControllerFindOne(organizationId!, id),
    enabled: !!(organizationId && id),
    refetchInterval: (query) => {
      const status = query.state.data?.data.status;
      return status === 'COMPLETED' || status === 'FAILED' ? false : 5000;
    }
  });
};
