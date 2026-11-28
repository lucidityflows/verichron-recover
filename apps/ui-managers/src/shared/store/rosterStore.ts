import { create } from 'zustand';
import { teamsService } from '../services/teamsService';

interface RosterMember {
  teamId: string;
  teamName: string;
}

interface RosterState {
  // Mapping of userId to team details
  membershipMap: Record<string, RosterMember>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchMembershipMap: (organizationId: string) => Promise<void>;
  clearRoster: () => void;
  getTeamForUser: (userId: string) => RosterMember | null;
}

export const useRosterStore = create<RosterState>((set, get) => ({
  membershipMap: {},
  isLoading: false,
  error: null,

  fetchMembershipMap: async (organizationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await teamsService.getMembershipMap(organizationId);
      set({ membershipMap: response.memberships as any, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch membership map', isLoading: false });
    }
  },

  clearRoster: () => set({ membershipMap: {}, error: null, isLoading: false }),

  getTeamForUser: (userId: string) => {
    return get().membershipMap[userId] || null;
  },
}));
