import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creditorConflictsService } from '../../../shared/services/creditorConflictsService.js';
import type {
  CreditorConflictsControllerFindPendingParams,
  ResolveConflictDto,
} from '../../../api/generated/debts_models/index.js';

/**
 * Hook to fetch list of creditor conflicts
 *
 * Polls every 10 seconds to show real-time updates as conflicts are created
 */
export const useCreditorConflicts = (params?: CreditorConflictsControllerFindPendingParams) => {
  return useQuery({
    queryKey: ['creditor-conflicts', params],
    queryFn: () => creditorConflictsService.listConflicts(params),
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Poll every 10 seconds for real-time updates
  });
};

/**
 * Hook to fetch a single conflict by ID with detailed match suggestions
 */
export const useCreditorConflict = (conflictId: string | null) => {
  return useQuery({
    queryKey: ['creditor-conflicts', conflictId],
    queryFn: () => creditorConflictsService.getConflictById(conflictId!),
    enabled: !!conflictId,
    staleTime: 5000,
  });
};

/**
 * Hook to resolve a conflict (merge, create new, or dismiss)
 */
export const useResolveConflict = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conflictId, dto }: { conflictId: string; dto: ResolveConflictDto }) =>
      creditorConflictsService.resolveConflict(conflictId, dto),
    onSuccess: () => {
      // Invalidate both conflicts list and creditors list
      queryClient.invalidateQueries({ queryKey: ['creditor-conflicts'] });
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
    },
  });
};
