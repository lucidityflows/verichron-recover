import { useQueryClient } from '@tanstack/react-query';
import { useUserStore } from '@/shared/store/userStore';
import {
  useWorkQueueControllerGetWorkQueue,
  useWorkQueueControllerCompleteItem,
  useWorkQueueControllerDeferItem,
  useWorkQueueControllerAssignItem,
} from '@/api/generated/collectors/endpoints/work-queue/work-queue';

import type { WorkQueueItemStatus, WorkQueuePriority, ResolutionType } from '@/api/generated/collectors_models';

interface WorkQueueFilters {
  priority?: WorkQueuePriority;
  status?: WorkQueueItemStatus;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * useWorkQueue
 * Manages work queue data and operations
 *
 * Based on legacy pattern but simplified for Flow State
 */
export const useWorkQueue = (filters?: WorkQueueFilters) => {
  const { organizationId } = useUserStore();
  const queryClient = useQueryClient();

  // Fetch work queue
  const workQueueQuery = useWorkQueueControllerGetWorkQueue(
    organizationId!,
    {
      priority: filters?.priority,
      status: filters?.status,
      searchQuery: filters?.search,
      page: filters?.page,
      pageSize: filters?.limit,
    },
    {
      query: {
        enabled: !!organizationId,
        staleTime: 30 * 1000, // 30 seconds - queue changes frequently
      },
    }
  );

  // Complete item mutation
  const completeItemMutation = useWorkQueueControllerCompleteItem({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['work-queue'] });
        void queryClient.invalidateQueries({ queryKey: ['performance'] });
      },
    },
  });

  // Defer item mutation
  const deferItemMutation = useWorkQueueControllerDeferItem({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['work-queue'] });
      },
    },
  });

  // Assign item mutation
  const assignItemMutation = useWorkQueueControllerAssignItem({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['work-queue'] });
      },
    },
  });

  return {
    items: workQueueQuery.data?.data?.items ?? [],
    summary: workQueueQuery.data?.data?.summary,
    isLoading: workQueueQuery.isLoading,
    isError: workQueueQuery.isError,
    error: workQueueQuery.error,
    refetch: workQueueQuery.refetch,

    // Helpers
    getNextDebtorId: (currentDebtorId: string): string | null => {
      const items = workQueueQuery.data?.data?.items ?? [];
      const currentIndex = items.findIndex(i => i.debtorId === currentDebtorId);
      
      // If found and not last, return next
      if (currentIndex !== -1 && currentIndex < items.length - 1) {
        return items[currentIndex + 1].debtorId;
      }
      
      // Otherwise return first item that isn't current
      const next = items.find(i => i.debtorId !== currentDebtorId);
      return next ? next.debtorId : null;
    },

    // Mutations
    completeItem: (itemId: string, resolutionType: ResolutionType) =>
      completeItemMutation.mutateAsync({
        organizationId: organizationId!,
        itemId,
        data: { resolutionType },
      }),
    isCompleting: completeItemMutation.isPending,

    deferItem: (itemId: string, deferUntil: string) =>
      deferItemMutation.mutateAsync({
        organizationId: organizationId!,
        itemId,
        data: { deferUntil },
      }),
    isDeferring: deferItemMutation.isPending,

    assignItem: (itemId: string, userId: string) =>
      assignItemMutation.mutateAsync({
        organizationId: organizationId!,
        itemId,
        data: { collectorUserId: userId },
      }),
    isAssigning: assignItemMutation.isPending,
  };
};
