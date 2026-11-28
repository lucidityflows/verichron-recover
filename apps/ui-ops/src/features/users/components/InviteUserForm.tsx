import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../../shared/services/userService.js';
import { rbacService } from '../../../shared/services/rbacService.js';
import { InviteUserDto, RoleResponseDto } from '../../../api/generated/users_models/index.js';
import { Input } from '../../../shared/components/Input.js';
import { Select, SelectOption } from '../../../shared/components/Select.js';
import { Button } from '../../../shared/components/Button.js';
import { Modal } from '../../../shared/components/Modal.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { validateField } from '../../../shared/utils/validation.js';
import { useAuthStore } from '../../../shared/store/authStore.js';

interface InviteUserFormProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteUserForm({ isOpen, onClose }: InviteUserFormProps) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((state) => state.organization?.id);
  const [formData, setFormData] = useState<InviteUserDto>({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch available roles
  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rbacService.listRoles({ page: 1, pageSize: 100 }),
    enabled: isOpen, // Only fetch when modal is open
  });

  // Map roles to select options
  const roleOptions: SelectOption[] = rolesData?.data?.map((role: RoleResponseDto) => ({
    value: role.id,
    label: `${role.name}${role.isSystemRole ? ' (System)' : ''}`,
  })) || [];

  const inviteMutation = useMutation({
    mutationFn: (data: InviteUserDto) => {
      if (!organizationId) throw new Error('Organization context is required');
      return userService.inviteUser(organizationId, data);
    },
    onSuccess: () => {
      toast.success('Administrator invitation dispatched');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to invite user');
      toast.error(message);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const emailValidation = validateField(formData.email, {
      required: true,
      email: true,
    });
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error!;
    }

    const firstNameValidation = validateField(formData.firstName, {
      required: true,
      minLength: 2,
    });
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.error!;
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Min 2 characters';
    }

    if (!formData.roleId.trim()) {
      newErrors.roleId = 'Selection required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Form validation failed');
      return;
    }

    const cleanData: InviteUserDto = {
      email: formData.email.trim().toLowerCase(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      roleId: formData.roleId.trim(),
    };

    inviteMutation.mutate(cleanData);
  };

  const handleClose = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      roleId: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite Administrator"
      description="Grant secure platform access to a new administrative user"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="First Name"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            error={errors.firstName}
            required
          />

          <Input
            label="Last Name"
            placeholder="Doe"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            error={errors.lastName}
            required
          />

          <Input
            label="Authorized Email"
            type="email"
            placeholder="john.doe@verichroninc.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            error={errors.email}
            helperText="The user will receive an activation challenge at this address"
            required
            className="md:col-span-2"
          />

          <Select
            label="Security Role Profile"
            value={formData.roleId}
            onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
            options={roleOptions}
            error={errors.roleId}
            helperText="Defines the user's operational permission set"
            required
            disabled={rolesLoading}
            className="md:col-span-2"
          />
        </div>

        <div className="p-4 rounded-lg bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/10">
          <p className="text-[11px] text-[var(--color-muted-foreground)] font-medium leading-relaxed">
            <span className="font-bold text-[var(--color-primary)] uppercase tracking-tight">Governance Note:</span> Invitations expire after 24 hours. Users will be assigned to the "Verichron Global" context by default until specific tenant associations are mapped.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={inviteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={inviteMutation.isPending}
          >
            Execute Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}