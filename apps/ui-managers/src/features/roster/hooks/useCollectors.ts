import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/shared/store/userStore';
import { collectorProfileControllerGetCollectorProfiles } from '@/api/generated/collectors/endpoints/collector-profiles/collector-profiles';
import { profilesControllerListUsers } from '@/api/generated/users/endpoints/users/users';

export const useCollectors = () => {
  const { organizationId } = useUser();

  return useQuery({
    queryKey: ['collectors-with-details', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      // Parallel fetch
      const [collectorsRes, usersRes] = await Promise.all([
        collectorProfileControllerGetCollectorProfiles(organizationId),
        profilesControllerListUsers(organizationId, { pageSize: 100 })
      ]);

      const collectors = collectorsRes.data;
      const users = usersRes.data.data;

      // Map users for O(1) lookup
      const userMap = new Map(users.map(u => [u.id, u]));

      // Enrich collectors
      return collectors.map(collector => {
        const user = userMap.get(collector.userId);
        return {
          ...collector,
          firstName: user?.firstName || 'Unknown',
          lastName: user?.lastName || 'User',
          email: user?.email,
          // Use collector availability status
          status: collector.availabilityStatus
        };
      });
    },
    enabled: !!organizationId,
  });
};