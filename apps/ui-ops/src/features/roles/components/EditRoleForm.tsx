import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacService } from '../../../shared/services/rbacService.js';
import { UpdateRoleDto, RoleResponseDto } from '../../../api/generated/users_models/index.js';
import { Input } from '../../../shared/components/Input.js';
import { Button, ButtonVariant, ButtonSize } from '../../../shared/components/Button.js';
import { Modal } from '../../../shared/components/Modal.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { validateField } from '../../../shared/utils/validation.js';
import { useAuthStore } from '../../../shared/store/authStore.js';

interface EditRoleFormProps {
  role: RoleResponseDto | null;
  onClose: () => void;
}

export function EditRoleForm({ role, onClose }: EditRoleFormProps) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((state) => state.organization?.id);
  const [formData, setFormData] = useState<UpdateRoleDto>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when role changes
  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: (role.description as unknown as string) || undefined,
      });
    }
  }, [role]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateRoleDto) => {
      if (!organizationId) throw new Error('Organization context is required');
      return rbacService.updateRole(organizationId, role!.id, data);
    },
    onSuccess: () => {
      toast.success('Role updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', role!.id] });
      handleClose();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update role');
      toast.error(message);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation if provided
    if (formData.name !== undefined) {
      const nameValidation = validateField(formData.name, {
        required: true,
        minLength: 2,
        maxLength: 100,
      });
      if (!nameValidation.isValid) {
        newErrors.name = nameValidation.error!;
      }
    }

    // Description validation if provided
    if (formData.description !== undefined) {
      const descriptionValidation = validateField(formData.description, {
        required: true,
        minLength: 10,
      });
      if (!descriptionValidation.isValid) {
        newErrors.description = descriptionValidation.error!;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the form errors');
      return;
    }

    // Only send changed fields
    const changedData: UpdateRoleDto = {};

    if (formData.name && formData.name !== role?.name) {
      changedData.name = formData.name.trim();
    }
    if (formData.description && formData.description !== (role?.description as unknown as string)) {
      changedData.description = formData.description.trim();
    }

    // Check if anything changed
    if (Object.keys(changedData).length === 0) {
      toast.info('No changes detected');
      handleClose();
      return;
    }

    updateMutation.mutate(changedData);
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    onClose();
  };

  if (!role) return null;

  return (
    <Modal
      isOpen={!!role}
      onClose={handleClose}
      title="Edit Role"
      description={`Update details for ${role.name}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Name */}
        <Input
          label="Role Name"
          placeholder="e.g., Collection Agent, Account Manager"
          value={formData.name || ''}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          error={errors.name}
          helperText="A descriptive name for this role"
          required
        />

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Description <span className="text-error">*</span>
          </label>
          <textarea
            placeholder="Describe the purpose and responsibilities of this role..."
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            className={`
              w-full px-3 py-2 rounded-lg border transition-all
              bg-background text-foreground
              focus:outline-none focus:ring-2 focus:ring-primary
              ${errors.description ? 'border-error' : 'border-border'}
            `}
          />
          {errors.description && (
            <p className="text-sm text-error">{errors.description}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Provide a clear description of what this role can do
          </p>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-lg bg-info/10 border border-info/20">
          <p className="text-sm text-foreground">
            <span className="font-semibold">Note:</span> Only custom roles can be edited. System roles are protected and cannot be modified. To manage permissions, view the role details.
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
          <Button
            type="button"
            variant={ButtonVariant.GHOST}
            onClick={handleClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={ButtonVariant.PRIMARY}
            size={ButtonSize.MD}
            loading={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
