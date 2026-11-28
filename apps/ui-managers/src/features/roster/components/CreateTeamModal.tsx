import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { useTeamsControllerCreateTeam, getTeamsControllerGetTeamsQueryKey } from '@/api/generated/organizations/endpoints/teams/teams';
import { useUser } from '@/shared/store/userStore';
import { useToast } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';

interface CreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose }) => {
  const { organizationId } = useUser();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const { mutateAsync: createTeam, isPending } = useTeamsControllerCreateTeam();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    try {
      await createTeam({
        organizationId,
        data: {
          name: formData.name,
          description: formData.description || undefined,
        },
      });

      queryClient.invalidateQueries({ queryKey: getTeamsControllerGetTeamsQueryKey(organizationId) });
      success('Team Created', `${formData.name} has been created successfully.`);
      setFormData({ name: '', description: '' });
      onClose();
    } catch (error: any) {
      toastError('Creation Failed', error.message || 'Failed to create team.');
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '' });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Team"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
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
            Create Team
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

        <div className="rounded-lg bg-muted p-4 border border-border">
          <h4 className="text-xs font-bold text-foreground uppercase tracking-widest mb-2">After Creation</h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Use <span className="font-bold text-foreground">Manage Roster</span> to add team members</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Use <span className="font-bold text-foreground">Add Portfolio</span> to assign work inventory</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Teams determine routing priority for automated dialer campaigns</span>
            </li>
          </ul>
        </div>
      </form>
    </Modal>
  );
};
