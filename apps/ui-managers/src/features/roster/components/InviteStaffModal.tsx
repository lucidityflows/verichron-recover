import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { useProfilesControllerInviteUser } from '@/api/generated/users/endpoints/users/users';
import { useRbacControllerListRoles } from '@/api/generated/users/endpoints/rbac/rbac';
import { useUser } from '@/shared/store/userStore';
import { useToast } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';

interface InviteStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

const initialFormData: FormData = {
  email: '',
  firstName: '',
  lastName: '',
  roleId: '',
};

export const InviteStaffModal: React.FC<InviteStaffModalProps> = ({ isOpen, onClose }) => {
  const { organizationId } = useUser();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const { mutateAsync: inviteUser, isPending: isInviting } = useProfilesControllerInviteUser();
  const { data: rolesData, isLoading: isLoadingRoles } = useRbacControllerListRoles(organizationId!, { pageSize: 100 });
  const roles = rolesData?.data?.data || [];

  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteUser({
        organizationId: organizationId!,
        data: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          roleId: formData.roleId,
        },
      });

      // Invalidate all user queries for this organization
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === 'users' && key[1] === organizationId;
        }
      });

      success('Invitation Sent', `Invitation sent to ${formData.email} successfully.`);
      setFormData(initialFormData);
      onClose();
    } catch (error: any) {
      toastError('Invitation Failed', error.message || 'Failed to send invitation.');
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Staff Member"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-md transition-colors"
            disabled={isInviting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isInviting || !formData.email || !formData.firstName || !formData.lastName || !formData.roleId}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isInviting && <Loader2 size={16} className="animate-spin" />}
            Send Invitation
          </button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full rounded-md border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              placeholder="Jane"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full rounded-md border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full rounded-md border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            placeholder="jane.doe@company.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Access Role</label>
          <select
            required
            value={formData.roleId}
            onChange={e => setFormData({ ...formData, roleId: e.target.value })}
            className="w-full rounded-md border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
            disabled={isLoadingRoles}
          >
            <option value="">Select a role...</option>
            {roles
              .map(role => (
                <option key={role.id} value={role.id}>
                  {role.name?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
          </select>
          {isLoadingRoles && <p className="text-xs text-muted-foreground mt-1">Loading roles...</p>}
        </div>

        <div className="rounded-lg bg-muted p-4 border border-border">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-widest mb-2">What Happens Next</h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>An email invitation will be sent to the provided address</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>The user will appear in the <span className="font-bold text-foreground">Pending</span> tab until they accept</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>After accepting, you can assign them to teams and portfolios</span>
            </li>
          </ul>
        </div>
      </form>
    </Modal>
  );
};
