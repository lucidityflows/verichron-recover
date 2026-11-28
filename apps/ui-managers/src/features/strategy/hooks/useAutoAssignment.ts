import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../../shared/store/userStore.js';
import { useToast } from '@/shared/hooks/useToast';
import { 
  autoAssignmentControllerFindAll,
  autoAssignmentControllerCreate,
  autoAssignmentControllerToggle,
  autoAssignmentControllerRemove
} from '../../../api/generated/workflows/endpoints/auto-assignment/auto-assignment.js';
import { type CreateAutoAssignmentDto } from '../../../api/generated/workflows_models/index.js';

export const useAutoAssignment = () => {
  const { organizationId } = useUser();
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  const query = useQuery({
    queryKey: ['autoAssignment', organizationId],
    queryFn: () => autoAssignmentControllerFindAll(organizationId!),
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAutoAssignmentDto) => 
      autoAssignmentControllerCreate(organizationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoAssignment', organizationId] });
      success('Segment Created', 'Auto-assignment configuration created successfully.');
    },
    onError: (err: any) => {
      toastError('Creation Failed', err.message || 'Failed to create segment.');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (configId: string) => 
      autoAssignmentControllerToggle(organizationId!, configId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['autoAssignment', organizationId] });
      const status = data.data.enabled ? 'enabled' : 'disabled';
      success('Segment Updated', `Segment ${status} successfully.`);
    },
    onError: (err: any) => {
      toastError('Update Failed', err.message || 'Failed to toggle segment.');
    }
  });

  const removeMutation = useMutation({
    mutationFn: (configId: string) => 
      autoAssignmentControllerRemove(organizationId!, configId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autoAssignment', organizationId] });
      success('Segment Deleted', 'Auto-assignment configuration removed successfully.');
    },
    onError: (err: any) => {
      toastError('Deletion Failed', err.message || 'Failed to remove segment.');
    }
  });

  return {
    configs: query.data?.data || [],
    isLoading: query.isLoading,
    createConfig: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    toggleConfig: toggleMutation.mutateAsync,
    removeConfig: removeMutation.mutateAsync,
  };
};
