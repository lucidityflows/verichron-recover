import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../../shared/store/userStore.js';
import {
  templatesControllerFindAll,
  templatesControllerCreate,
  templatesControllerUpdate,
  templatesControllerRemove
} from '../../../api/generated/communications/endpoints/communication-templates/communication-templates.js';
import { type CreateTemplateDto, type UpdateTemplateDto } from '../../../api/generated/communications_models/index.js';

export const useCommunicationTemplates = (channel?: 'EMAIL' | 'SMS' | 'LETTER') => {
  const { organizationId } = useUser();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ['communicationTemplates', organizationId, channel],
    queryFn: () => templatesControllerFindAll(organizationId!, { type: channel }),
    enabled: !!organizationId,
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: CreateTemplateDto) =>
      templatesControllerCreate(organizationId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communicationTemplates', organizationId] });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: UpdateTemplateDto }) =>
      templatesControllerUpdate(organizationId!, templateId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communicationTemplates', organizationId] });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) =>
      templatesControllerRemove(organizationId!, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communicationTemplates', organizationId] });
    },
  });

  return {
    templates: (templatesQuery.data?.data as unknown as any[]) || [],
    isLoading: templatesQuery.isLoading,
    isError: templatesQuery.isError,
    error: templatesQuery.isError,
    createTemplate: createTemplateMutation.mutateAsync,
    isCreating: createTemplateMutation.isPending,
    updateTemplate: updateTemplateMutation.mutateAsync,
    isUpdating: updateTemplateMutation.isPending,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    isDeleting: deleteTemplateMutation.isPending,
  };
};
