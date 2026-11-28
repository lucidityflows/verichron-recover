import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '../../../shared/store/userStore.js';
import { 
  notificationControllerGetNotifications,
  notificationControllerMarkNotificationRead,
  notificationControllerMarkAllNotificationsRead
} from '../../../api/generated/collectors/endpoints/notifications/notifications.js';
import { type NotificationControllerGetNotificationsParams, type MarkNotificationReadDto } from '../../../api/generated/collectors_models/index.js';

export const useEscalations = (params?: NotificationControllerGetNotificationsParams) => {
  const { organizationId } = useUser();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['escalations', organizationId, params],
    queryFn: () => notificationControllerGetNotifications(organizationId!, {
      ...params,
      // Focus on manager-level notifications which are the basis for the Escalation Inbox
      // In a real scenario, the API might have a specific /escalations endpoint, 
      // but for now we filter notifications.
    }),
    enabled: !!organizationId,
    staleTime: 10000, // Frequent updates for inbox
  });

  const markReadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: MarkNotificationReadDto }) => 
      notificationControllerMarkNotificationRead(organizationId!, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalations', organizationId] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationControllerMarkAllNotificationsRead(organizationId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalations', organizationId] });
    }
  });

  return {
    items: query.data?.data || [],
    isLoading: query.isLoading,
    error: query.error,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
  };
};
