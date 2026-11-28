import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../../shared/store/userStore.js';
import {
  escalationRulesControllerFindAll,
  escalationRulesControllerCreate,
  escalationRulesControllerUpdate,
  escalationRulesControllerRemove
} from '../../../api/generated/workflows/endpoints/escalation-rules/escalation-rules.js';
import { type CreateEscalationRuleDto, type UpdateEscalationRuleDto } from '../../../api/generated/workflows_models/index.js';

export const useEscalationRules = () => {
  const { organizationId } = useUser();
  const queryClient = useQueryClient();

  const escalationRulesQuery = useQuery({
    queryKey: ['escalationRules', organizationId],
    queryFn: () => escalationRulesControllerFindAll(organizationId!),
    enabled: !!organizationId,
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: CreateEscalationRuleDto) =>
      escalationRulesControllerCreate(organizationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalationRules', organizationId] });
    },
  });

  const updateRuleMutation = useMutation({
    mutationFn: ({ ruleId, data }: { ruleId: string; data: UpdateEscalationRuleDto }) =>
      escalationRulesControllerUpdate(organizationId!, ruleId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalationRules', organizationId] });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) =>
      escalationRulesControllerRemove(organizationId!, ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalationRules', organizationId] });
    },
  });

  return {
    rules: escalationRulesQuery.data?.data || [],
    isLoading: escalationRulesQuery.isLoading,
    isError: escalationRulesQuery.isError,
    error: escalationRulesQuery.error,
    createRule: createRuleMutation.mutateAsync,
    isCreating: createRuleMutation.isPending,
    updateRule: updateRuleMutation.mutateAsync,
    isUpdating: updateRuleMutation.isPending,
    deleteRule: deleteRuleMutation.mutateAsync,
    isDeleting: deleteRuleMutation.isPending,
  };
};
