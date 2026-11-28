import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../../shared/services/userService.js';
import { UpdateUserDto, UserDetailDto, UserSummaryDto, UserStatus } from '../../../api/generated/users_models/index.js';
import { Input } from '../../../shared/components/Input.js';
import { Select, SelectOption } from '../../../shared/components/Select.js';
import { Button } from '../../../shared/components/Button.js';
import { Modal } from '../../../shared/components/Modal.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { validateField } from '../../../shared/utils/validation.js';
import { useAuthStore } from '../../../shared/store/authStore.js';

interface EditUserFormProps {
  user: UserSummaryDto | UserDetailDto | null;
  onClose: () => void;
}

const userStatusOptions: SelectOption[] = [
  { value: UserStatus.ACTIVE, label: 'Active' },
  { value: UserStatus.PENDING, label: 'Pending' },
  { value: UserStatus.SUSPENDED, label: 'Suspended' },
  { value: UserStatus.INACTIVE, label: 'Inactive' },
];

export function EditUserForm({ user, onClose }: EditUserFormProps) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((state) => state.organization?.id);
  const [formData, setFormData] = useState<UpdateUserDto>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserDto) => {
      if (!organizationId) throw new Error('Organization context is required');
      return userService.updateUser(organizationId, user!.id, data);
    },
    onSuccess: () => {
      toast.success('User identity updated');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', user!.id] });
      handleClose();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update user');
      toast.error(message);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.firstName) {
      const firstNameValidation = validateField(formData.firstName, {
        required: true,
        minLength: 2,
      });
      if (!firstNameValidation.isValid) {
        newErrors.firstName = firstNameValidation.error!;
      }
    }

    if (formData.lastName) {
      const lastNameValidation = validateField(formData.lastName, {
        required: true,
        minLength: 2,
      });
      if (!lastNameValidation.isValid) {
        newErrors.lastName = lastNameValidation.error!;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Validation failed');
      return;
    }

    const updates: UpdateUserDto = {};
    if (formData.firstName && formData.firstName !== user?.firstName) {
      updates.firstName = formData.firstName.trim();
    }
    if (formData.lastName && formData.lastName !== user?.lastName) {
      updates.lastName = formData.lastName.trim();
    }
    if (formData.status && formData.status !== user?.status) {
      updates.status = formData.status;
    }

    if (Object.keys(updates).length === 0) {
      toast.info('No changes detected');
      return;
    }

    updateMutation.mutate(updates);
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={!!user}
      onClose={handleClose}
      title="Edit User Record"
      description="Update administrator principal information and status"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="First Name"
            placeholder="John"
            value={formData.firstName || ''}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            error={errors.firstName}
            required
          />

          <Input
            label="Last Name"
            placeholder="Doe"
            value={formData.lastName || ''}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            error={errors.lastName}
            required
          />

          <Input
            label="Authorized Email"
            type="email"
            value={user?.email || ''}
            disabled
            helperText="Principal identity cannot be modified"
            className="md:col-span-2"
          />

          <Select
            label="Account Status"
            options={userStatusOptions}
            value={formData.status || ''}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as UserStatus })}
            required
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={updateMutation.isPending}
          >
            Commit Record Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}