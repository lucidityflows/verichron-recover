import React, { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Calendar, 
  User, 
  MoreVertical,
  Pencil,
  Trash2,
  ShieldCheck,
  Building2,
  Loader2,
  ArrowRight,
  Users2
} from 'lucide-react';
import { format } from 'date-fns';
import { useUser } from '@/shared/store/userStore';
import { useProfilesControllerGetUserById, useProfilesControllerDeleteUser } from '@/api/generated/users/endpoints/users/users';
import { useTeamsControllerGetUserTeams } from '@/api/generated/organizations/endpoints/teams/teams';
import { useToast } from '@/shared/hooks';
import { EditStaffModal } from './components/EditStaffModal.js';
import { cn } from '@/shared/utils/cn';

export const StaffProfile: React.FC = () => {
  const { userId } = useParams({ from: '/roster/staff/$userId' });
  const { organizationId } = useUser();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch User Details
  const { data: userResponse, isLoading } = useProfilesControllerGetUserById(organizationId!, userId);
  const user = userResponse?.data;

  // Fetch User's Teams
  const { data: userTeamsData, isLoading: isLoadingTeams } = useTeamsControllerGetUserTeams(organizationId!, userId);
  const userTeams = userTeamsData?.data || [];

  // Delete Mutation
  const { mutateAsync: deleteUser } = useProfilesControllerDeleteUser();

  const handleRemoveUser = async () => {
    if (!window.confirm('Are you sure you want to remove this user? This action cannot be undone.')) return;
    
    try {
      await deleteUser({ organizationId: organizationId!, userId });
      success('User Removed', 'Staff member has been removed from the organization.');
      navigate({ to: '/roster/staff' });
    } catch (error: any) {
      toastError('Removal Failed', error.message || 'Failed to remove user.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-medium">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-[400px] items-center justify-center gap-4">
        <div className="text-muted-foreground font-medium">User not found</div>
        <button onClick={() => navigate({ to: '/roster/staff' })} className="text-primary hover:underline">
          Return to directory
        </button>
      </div>
    );
  }

  const membership = user.memberships?.find(m => m.organizationId === organizationId);
  const roleName = membership?.role?.name || 'Staff Member';
  const joinedAt = membership?.joinedAt ? new Date(membership.joinedAt) : new Date(user.createdAt);

  // Map to Summary DTO for Edit Modal compatibility
  const userSummary = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    status: user.status
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate({ to: '/roster/staff' })}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Directory
        </button>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-border text-sm font-bold shadow-sm hover:bg-muted transition-all"
          >
            <Pencil size={14} />
            Edit Profile
          </button>
          <button 
            onClick={handleRemoveUser}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-error/10 border border-error/20 text-sm font-bold text-error shadow-sm hover:bg-error/20 transition-all"
          >
            <Trash2 size={14} />
            Remove
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border" />
        <div className="px-8 pb-8">
          <div className="relative flex justify-between items-end -mt-12 mb-6">
            <div className="flex items-end gap-6">
              <div className="h-24 w-24 rounded-2xl bg-card border-4 border-card shadow-lg flex items-center justify-center text-primary text-3xl font-bold">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <div className="mb-1 space-y-1">
                <h1 className="text-2xl font-bold text-foreground">{user.firstName} {user.lastName}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail size={14} />
                    {user.email}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-primary" />
                    {roleName}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border",
                user.status === 'ACTIVE' 
                  ? "bg-success/10 text-success border-success/20" 
                  : "bg-warning/10 text-warning border-warning/20"
              )}>
                {user.status}
              </span>
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Calendar size={12} />
                Joined {format(joinedAt, 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-border">
            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <User size={14} /> Contact Details
              </h3>
              <div className="space-y-3">
                {user.phoneNumbers?.map((phone, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="p-2 rounded-md bg-muted text-muted-foreground">
                      <Phone size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{(phone as any).number || (phone as any).phoneNumber}</span>
                      <span className="text-xs text-muted-foreground capitalize">{(phone as any).type || (phone as any).phoneType}</span>
                    </div>
                  </div>
                ))}
                {(!user.phoneNumbers || user.phoneNumbers.length === 0) && (
                  <p className="text-sm text-muted-foreground italic">No phone numbers listed.</p>
                )}
                
                {user.addresses?.map((addr, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm mt-2">
                    <div className="p-2 rounded-md bg-muted text-muted-foreground">
                      <MapPin size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{addr.street1}</span>
                      {addr.street2 && <span className="text-xs text-muted-foreground">{addr.street2}</span>}
                      <span className="text-xs text-muted-foreground">
                        {addr.city}, {addr.state} {addr.postalCode}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Role & Permissions */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Shield size={14} /> Security Access
              </h3>
              <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Assigned Role</span>
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                    {roleName}
                  </span>
                </div>
                {/* Future: List explicit permissions here */}
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This user has {roleName} level access to the organization's resources.
                </p>
              </div>
            </div>

            {/* Teams */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Building2 size={14} /> Team Assignments
                </h3>
              </div>
              
              <div className={cn(
                "p-4 rounded-lg border border-border bg-muted/10 min-h-[100px]",
                userTeams.length === 0 && "border-dashed flex flex-col items-center justify-center text-center"
              )}>
                {isLoadingTeams ? (
                  <div className="flex justify-center py-4">
                    <Loader2 size={20} className="animate-spin text-muted-foreground" />
                  </div>
                ) : userTeams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active team assignments.</p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {userTeams.map((team) => (
                        <button
                          key={team.id}
                          onClick={() => navigate({ to: '/roster/teams/$teamId', params: { teamId: team.id } })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/20 transition-all uppercase tracking-tight"
                          title={`View ${team.name} details`}
                        >
                          <Users2 size={12} />
                          {team.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditStaffModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        user={userSummary}
      />
    </div>
  );
};
