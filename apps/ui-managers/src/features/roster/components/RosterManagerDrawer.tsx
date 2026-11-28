import React, { useState } from 'react';
import { Search, X, UserPlus, CheckCircle2, Users2, Shield, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useUsers } from '../hooks/useUsers.js';
import { useUser } from '@/shared/store/userStore';
import { 
  useTeamsControllerAddTeamMember, 
  useTeamsControllerRemoveTeamMember,
  getTeamsControllerGetTeamMembersQueryKey 
} from '@/api/generated/organizations/endpoints/teams/teams';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/shared/hooks';

interface RosterManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  teamId: string;
  currentMemberIds: string[];
}

/**
 * RosterManagerDrawer
 * High-density UI for adding/removing staff from a specific team.
 */
export const RosterManagerDrawer: React.FC<RosterManagerDrawerProps> = ({ isOpen, onClose, teamName, teamId, currentMemberIds }) => {
  const { organizationId } = useUser();
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { success, error: toastError } = useToast();

  // Fetch all staff
  const { data: usersData, isLoading: isLoadingUsers } = useUsers(organizationId, {
    pageSize: 100, // Fetch more for selection list
    search: search || undefined
  });
  const staff = usersData?.data || [];

  // Mutations
  const { mutateAsync: addMember, isPending: isAdding } = useTeamsControllerAddTeamMember();
  const { mutateAsync: removeMember, isPending: isRemoving } = useTeamsControllerRemoveTeamMember();

  const handleAssign = async (userId: string) => {
    try {
      await addMember({
        organizationId: organizationId!,
        teamId,
        data: { userId, isPrimary: false }
      });
      queryClient.invalidateQueries({ queryKey: getTeamsControllerGetTeamMembersQueryKey(organizationId!, teamId) });
      success('Member Added', 'Staff member added to team.');
    } catch (err: any) {
      toastError('Assignment Failed', err.message);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await removeMember({
        organizationId: organizationId!,
        teamId,
        userId
      });
      queryClient.invalidateQueries({ queryKey: getTeamsControllerGetTeamMembersQueryKey(organizationId!, teamId) });
      success('Member Removed', 'Staff member removed from team.');
    } catch (err: any) {
      toastError('Removal Failed', err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[400] flex justify-end bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Users2 size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-none">Manage Roster</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">{teamName}</p>
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
              placeholder="Search available staff..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Staff List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {isLoadingUsers ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            staff.map((user) => {
              const isAssigned = currentMemberIds.includes(user.id);
              
              return (
                <div key={user.id} className="p-3 flex items-center justify-between rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Shield size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{user.firstName} {user.lastName}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{user.email}</p>
                    </div>
                  </div>
                  
                  {isAssigned ? (
                    <button 
                      onClick={() => handleRemove(user.id)}
                      disabled={isRemoving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-50 border border-red-100 text-[10px] font-black text-red-600 hover:bg-red-100 transition-all shadow-sm active:scale-95"
                    >
                      <Trash2 size={14} />
                      REMOVE
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleAssign(user.id)}
                      disabled={isAdding}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white border border-slate-200 text-[10px] font-black text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                    >
                      <UserPlus size={14} />
                      ASSIGN
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-100">
          <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold shadow-xl active:scale-95 transition-all">
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};