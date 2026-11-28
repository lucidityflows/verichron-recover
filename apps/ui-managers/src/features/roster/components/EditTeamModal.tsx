import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { useTeamsControllerUpdateTeam, getTeamsControllerGetTeamByIdQueryKey, getTeamsControllerGetTeamsQueryKey } from '@/api/generated/organizations/endpoints/teams/teams';
import { useUser } from '@/shared/store/userStore';
import { useToast } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';

interface EditTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  initialData: {
    name: string;
    description?: string;
  };
}

export const EditTeamModal: React.FC<EditTeamModalProps> = ({ isOpen, onClose, teamId, initialData }) => {
  const { organizationId } = useUser();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const { mutateAsync: updateTeam, isPending } = useTeamsControllerUpdateTeam();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: initialData.name,
        description: initialData.description || '',
      });
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    try {
      await updateTeam({
        organizationId,
        teamId,
        data: {
          name: formData.name,
          description: formData.description || undefined,
        },
      });

      queryClient.invalidateQueries({ queryKey: getTeamsControllerGetTeamByIdQueryKey(organizationId, teamId) });
      queryClient.invalidateQueries({ queryKey: getTeamsControllerGetTeamsQueryKey(organizationId) });
      success('Team Updated', `${formData.name} has been updated successfully.`);
      onClose();
    } catch (error: any) {
      toastError('Update Failed', error.message || 'Failed to update team.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Team Details"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-md transition-colors"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !formData.name.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Team Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={255}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Collections Alpha, Recovery Team"
            className="w-full rounded-md border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Maximum 255 characters</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-foreground">
            Description
          </label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the team's purpose and responsibilities..."
            className="w-full rounded-md border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary resize-none"
          />
          <p className="text-[10px] text-muted-foreground mt-1">Optional</p>
        </div>
      </form>
    </Modal>
  );
};
