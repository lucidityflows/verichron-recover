import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/shared/store/userStore';
import { floorService } from '@/shared/services/floorService';

/**
 * useFloorStatus
 * Team Lead hook for monitoring collector floor activity
 */
export const useFloorStatus = (teamId?: string) => {
  const { organizationId } = useUser();
  const queryClient = useQueryClient();

  const floorStatusQuery = useQuery({
    queryKey: ['floor', 'status', organizationId, teamId],
    queryFn: () => floorService.getFloorStatus(organizationId!, teamId),
    enabled: !!organizationId,
    refetchInterval: 10000,
  });

  const approvalsQuery = useQuery({
    queryKey: ['floor', 'approvals', organizationId],
    queryFn: () => floorService.getPendingSettlements(organizationId!),
    enabled: !!organizationId,
    refetchInterval: 5000,
  });

  const actionsQuery = useQuery({
    queryKey: ['floor', 'actions', organizationId, teamId],
    queryFn: () => floorService.getRecentActions(organizationId!, teamId),
    enabled: !!organizationId,
    refetchInterval: 5000,
  });

  const approveSettlementMutation = useMutation({
    mutationFn: ({ approvalId }: { approvalId: string }) =>
      floorService.approveSettlement(organizationId!, approvalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['floor', 'approvals'] });
    },
  });

  const rejectSettlementMutation = useMutation({
    mutationFn: ({ approvalId }: { approvalId: string; reason: string }) =>
      floorService.rejectSettlement(organizationId!, approvalId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['floor', 'approvals'] });
    },
  });

  // Map backend SettlementOffers to UI ApprovalRequests
  const mappedApprovals = (approvalsQuery.data || []).map((offer) => ({
    id: offer.id,
    type: 'SETTLEMENT' as const,
    collectorName: `Collector ${offer.createdBy?.substring(0, 5) || 'Unknown'}`,
    debtorName: `Debtor ${offer.debtId.substring(0, 5)}`,
    requestedAmount: parseFloat(offer.settlementAmount),
    originalBalance: parseFloat(offer.originalBalance),
    reason: offer.notes,
    createdAt: offer.offerDate,
    urgency: (parseFloat(offer.settlementPercentage) < 50 ? 'HIGH' : 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
  }));

  // Map actions to LiveFeed events
  type FeedEventType = 'CALL' | 'PAYMENT' | 'PTP' | 'SETTLEMENT_APPROVED' | 'SETTLEMENT_REJECTED' | 'GOAL_HIT';
  const mappedActions = (actionsQuery.data || []).map((action) => ({
    id: action.id,
    type: (action.actionType || 'CALL') as FeedEventType,
    collectorName: `Collector ${action.collectorUserId.substring(0, 5)}`,
    debtorName: `Debtor ${action.debtorId.substring(0, 5)}`,
    amount: action.actionType === 'PAYMENT' ? action.metadata?.amount : undefined,
    timestamp: action.timestamp,
  }));

  return {
    collectors: floorStatusQuery.data?.collectors ?? [],
    teamStats: floorStatusQuery.data?.teamStats,
    approvals: mappedApprovals,
    actions: mappedActions,
    isLoading: floorStatusQuery.isLoading || approvalsQuery.isLoading || actionsQuery.isLoading,
    isError: floorStatusQuery.isError || approvalsQuery.isError || actionsQuery.isError,
    error: floorStatusQuery.error ?? approvalsQuery.error ?? actionsQuery.error,
    approveSettlement: approveSettlementMutation.mutateAsync,
    rejectSettlement: rejectSettlementMutation.mutateAsync,
    isApproving: approveSettlementMutation.isPending,
    isRejecting: rejectSettlementMutation.isPending,
  };
};
