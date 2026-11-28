import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { creditorsService } from '../../../shared/services/creditorsService.js';
import type {
  CreditorsControllerFindAllParams,
  CreateCreditorDto,
  UpdateCreditorDto,
  MergeCreditorDto,
} from '../../../api/generated/debts_models/index.js';

/**
 * Hook to fetch list of creditors
 */
export const useCreditors = (params?: CreditorsControllerFindAllParams) => {
  return useQuery({
    queryKey: ['creditors', params],
    queryFn: () => creditorsService.listCreditors(params),
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to fetch a single creditor by ID
 */
export const useCreditor = (creditorId: string | null) => {
  return useQuery({
    queryKey: ['creditors', creditorId],
    queryFn: () => creditorsService.getCreditorById(creditorId!),
    enabled: !!creditorId,
    staleTime: 30000,
  });
};

/**
 * Hook to create a new creditor
 */
export const useCreateCreditor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCreditorDto) => creditorsService.createCreditor(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
    },
  });
};

/**
 * Hook to update a creditor
 */
export const useUpdateCreditor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ creditorId, dto }: { creditorId: string; dto: UpdateCreditorDto }) =>
      creditorsService.updateCreditor(creditorId, dto),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      queryClient.invalidateQueries({ queryKey: ['creditors', variables.creditorId] });
    },
  });
};

/**
 * Hook to delete a creditor
 */
export const useDeleteCreditor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creditorId: string) => creditorsService.deleteCreditor(creditorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
    },
  });
};

/**
 * Hook to merge duplicate creditor into master
 */
export const useMergeCreditor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ duplicateCreditorId, dto }: { duplicateCreditorId: string; dto: MergeCreditorDto }) =>
      creditorsService.mergeCreditor(duplicateCreditorId, dto),
    onSuccess: () => {
      // Invalidate both creditors list and conflicts
      queryClient.invalidateQueries({ queryKey: ['creditors'] });
      queryClient.invalidateQueries({ queryKey: ['creditor-conflicts'] });
    },
  });
};
