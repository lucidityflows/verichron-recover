import { useQuery } from '@tanstack/react-query';
import { usersService } from '../../../shared/services/usersService.js';
import { type ProfilesControllerListUsersParams } from '../../../api/generated/users_models/index.js';

export const useUsers = (organizationId?: string | null, params?: ProfilesControllerListUsersParams) => {
  return useQuery({
    queryKey: ['users', organizationId, params],
    queryFn: () => usersService.listUsers(organizationId!, params),
    enabled: !!organizationId,
    // Standard stale time for directory data
    staleTime: 60000, 
  });
};
