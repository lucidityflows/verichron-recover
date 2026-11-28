import React, { useState } from 'react';
import { Search, X, Users2, Plus, Loader2, Trash2, ShieldCheck } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useTeams } from '../hooks/useTeams';
import { useUser } from '@/shared/store/userStore';
import { 
  useTeamsControllerAddTeamMember, 
  useTeamsControllerRemoveTeamMember,
  getTeamsControllerGetTeamMembersQueryKey,
  getTeamsControllerGetTeamsQueryKey
} from '@/api/generated/organizations/endpoints/teams/teams';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks';

interface AssignTeamDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  currentTeamIds: string[];
}

/**
 * AssignTeamDrawer
 * High-density UI for adding/removing a specific staff member from various teams.
 */
export const AssignTeamDrawer: React.FC<AssignTeamDrawerProps> = ({ 
  isOpen, 
  onClose, 
  userId, 
  userName,
  currentTeamIds 
}) => {
  const { organizationId } = useUser();
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  // Fetch all teams
  const { data: teams, isLoading: isLoadingTeams } = useTeams(organizationId);
  
  const filteredTeams = (teams || []).filter(team => 
    team.name.toLowerCase().includes(search.toLowerCase())
  );

  // Mutations
  const { mutateAsync: addMember, isPending: isAdding } = useTeamsControllerAddTeamMember();
  const { mutateAsync: removeMember, isPending: isRemoving } = useTeamsControllerRemoveTeamMember();

  const handleAssign = async (teamId: string, teamName: string) => {
    try {
      await addMember({
        organizationId: organizationId!,
        teamId,
        data: { userId, isPrimary: false }
      });
      
      // Invalidate both the team's member list and the general teams list (for member counts)
      queryClient.invalidateQueries({ queryKey: getTeamsControllerGetTeamMembersQueryKey(organizationId!, teamId) });
      queryClient.invalidateQueries({ queryKey: getTeamsControllerGetTeamsQueryKey(organizationId!) });
      
      success('Assignment Successful', `${userName} has been assigned to ${teamName}.`);
    } catch (err: any) {
      toastError('Assignment Failed', err.message || 'Failed to assign user to team.');
    }
  };

  const handleRemove = async (teamId: string, teamName: string) => {
    try {
      await removeMember({
        organizationId: organizationId!,
        teamId,
        userId
      });
      
      queryClient.invalidateQueries({ queryKey: getTeamsControllerGetTeamMembersQueryKey(organizationId!, teamId) });
      queryClient.invalidateQueries({ queryKey: getTeamsControllerGetTeamsQueryKey(organizationId!) });
      
      success('Member Removed', `${userName} removed from ${teamName}.`);
    } catch (err: any) {
      toastError('Removal Failed', err.message || 'Failed to remove user from team.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex justify-end bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Users2 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold leading-none">Team Assignments</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">{userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search teams..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Teams List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {isLoadingTeams ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-indigo-600" />
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 italic">No teams found.</div>
          ) : (
            filteredTeams.map((team) => {
              const isAssigned = currentTeamIds.includes(team.id);
              
              return (
                <div key={team.id} className="p-3 flex items-center justify-between rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center transition-colors",
                      isAssigned ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
                    )}>
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{team.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{team.memberCount} Members</p>
                    </div>
                  </div>
                  
                  {isAssigned ? (
                    <button 
                      onClick={() => handleRemove(team.id, team.name)}
                      disabled={isRemoving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-50 border border-red-100 text-[10px] font-black text-red-600 hover:bg-red-100 transition-all shadow-sm active:scale-95"
                    >
                      <Trash2 size={14} />
                      REMOVE
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleAssign(team.id, team.name)}
                      disabled={isAdding}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-200 text-[10px] font-black text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                    >
                      <Plus size={14} />
                      ASSIGN
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold shadow-xl active:scale-95 transition-all hover:bg-slate-800">
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
