import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../../shared/store/userStore.js';
import { 
  strategyControllerGetMatrix, 
  strategyControllerUpdateMatrix,
  strategyControllerGetLadder,
  strategyControllerUpdateLadder
} from '../../../api/generated/organizations/endpoints/tactical-strategy/tactical-strategy.js';
import { type UpdateSettlementStrategyDto, type UpdateApprovalLadderDto } from '../../../api/generated/organizations_models/index.js';

export const useSettlementStrategy = () => {
  const { organizationId } = useUser();
  const queryClient = useQueryClient();

  const matrixQuery = useQuery({
    queryKey: ['settlementMatrix', organizationId],
    queryFn: () => strategyControllerGetMatrix(organizationId!),
    enabled: !!organizationId,
  });

  const ladderQuery = useQuery({
    queryKey: ['approvalLadder', organizationId],
    queryFn: () => strategyControllerGetLadder(organizationId!),
    enabled: !!organizationId,
  });

  const updateMatrixMutation = useMutation({
    mutationFn: (data: UpdateSettlementStrategyDto) => 
      strategyControllerUpdateMatrix(organizationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlementMatrix', organizationId] });
    },
  });

  const updateLadderMutation = useMutation({
    mutationFn: (data: UpdateApprovalLadderDto) => 
      strategyControllerUpdateLadder(organizationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalLadder', organizationId] });
    },
  });

  return {
    matrix: matrixQuery.data?.data || [],
    isLoadingMatrix: matrixQuery.isLoading,
    ladder: ladderQuery.data?.data || [],
    isLoadingLadder: ladderQuery.isLoading,
    updateMatrix: updateMatrixMutation.mutateAsync,
    isUpdatingMatrix: updateMatrixMutation.isPending,
    updateLadder: updateLadderMutation.mutateAsync,
    isUpdatingLadder: updateLadderMutation.isPending,
  };
};
