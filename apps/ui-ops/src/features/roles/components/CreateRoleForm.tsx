import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacService } from '../../../shared/services/rbacService.js';
import { CreateRoleDto } from '../../../api/generated/users_models/index.js';
import { Input } from '../../../shared/components/Input.js';
import { Button, ButtonVariant, ButtonSize } from '../../../shared/components/Button.js';
import { Modal } from '../../../shared/components/Modal.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { validateField } from '../../../shared/utils/validation.js';
import { useAuthStore } from '../../../shared/store/authStore.js';

interface CreateRoleFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateRoleForm({ isOpen, onClose }: CreateRoleFormProps) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((state) => state.organization?.id);
  const [formData, setFormData] = useState<CreateRoleDto>({
    name: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: CreateRoleDto) => {
      if (!organizationId) throw new Error('Organization context is required');
      return rbacService.createRole(organizationId, data);
    },
    onSuccess: () => {
      toast.success('Role created successfully!');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      handleClose();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to create role');
      toast.error(message);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    const nameValidation = validateField(formData.name, {
      required: true,
      minLength: 2,
      maxLength: 100,
    });
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error!;
    }

    // Description validation
    const descriptionValidation = validateField(formData.description, {
      required: true,
      minLength: 10,
    });
    if (!descriptionValidation.isValid) {
      newErrors.description = descriptionValidation.error!;
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

    const cleanData: CreateRoleDto = {
      name: formData.name.trim(),
      description: formData.description.trim(),
    };

    createMutation.mutate(cleanData);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Role"
      description="Create a custom role with specific permissions for your organization"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Role Name */}
        <Input
          label="Role Name"
          placeholder="e.g., Collection Agent, Account Manager"
          value={formData.name}
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
            value={formData.description}
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
            <span className="font-semibold">Note:</span> After creating the role, you can assign specific permissions to it through the role details page. System roles cannot be modified or deleted.
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
          <Button
            type="button"
            variant={ButtonVariant.GHOST}
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={ButtonVariant.PRIMARY}
            size={ButtonSize.MD}
            loading={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating Role...' : 'Create Role'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
