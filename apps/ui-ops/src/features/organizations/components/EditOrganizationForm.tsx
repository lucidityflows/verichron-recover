import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '../../../shared/services/organizationService.js';
import { UpdateOrganizationDto, OrganizationResponseDto, OrganizationType, OrganizationStatus } from '../../../api/generated/organizations_models/index.js';
import { Input } from '../../../shared/components/Input.js';
import { Select, SelectOption } from '../../../shared/components/Select.js';
import { Button } from '../../../shared/components/Button.js';
import { Modal } from '../../../shared/components/Modal.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { validateField, formatTaxId } from '../../../shared/utils/validation.js';

interface EditOrganizationFormProps {
  organization: OrganizationResponseDto | null;
  onClose: () => void;
}

const organizationTypeOptions: SelectOption[] = [
  { value: OrganizationType.COLLECTION_AGENCY, label: 'Collection Agency' },
  { value: OrganizationType.CREDITOR, label: 'Creditor' },
  { value: OrganizationType.PARTNER, label: 'Partner' },
];

const organizationStatusOptions: SelectOption[] = [
  { value: OrganizationStatus.ACTIVE, label: 'Active' },
  { value: OrganizationStatus.PROVISIONING, label: 'Provisioning' },
  { value: OrganizationStatus.SUSPENDED, label: 'Suspended' },
  { value: OrganizationStatus.INACTIVE, label: 'Inactive' },
  { value: OrganizationStatus.FAILED, label: 'Failed' },
];

export function EditOrganizationForm({ organization, onClose }: EditOrganizationFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UpdateOrganizationDto>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name,
        displayName: organization.displayName || '',
        organizationType: organization.organizationType,
        taxId: organization.taxId || '',
        status: organization.status,
      });
    }
  }, [organization]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateOrganizationDto) => organizationService.updateOrganization(organization!.id, data),
    onSuccess: () => {
      toast.success('Tenant configuration updated');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organization', organization!.id] });
      handleClose();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update organization');
      toast.error(message);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.name) {
      const nameValidation = validateField(formData.name, {
        required: true,
        minLength: 2,
        custom: (val) => /^[a-zA-Z0-9\s'-]+$/.test(val),
        customMessage: 'Only alphanumeric characters, spaces, hyphens, and apostrophes allowed'
      });
      if (!nameValidation.isValid) {
        newErrors.name = nameValidation.error!;
      }
    }

    if (formData.taxId) {
      const taxIdValidation = validateField(formData.taxId, {
        taxId: true,
      });
      if (!taxIdValidation.isValid) {
        newErrors.taxId = taxIdValidation.error!;
      }
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

    const updates: UpdateOrganizationDto = {};
    if (formData.name && formData.name !== organization?.name) {
      updates.name = formData.name.trim();
    }
    if (formData.displayName !== undefined && formData.displayName !== organization?.displayName) {
      updates.displayName = formData.displayName?.trim() || undefined;
    }
    if (formData.organizationType && formData.organizationType !== organization?.organizationType) {
      updates.organizationType = formData.organizationType;
    }
    if (formData.taxId !== undefined && formData.taxId !== organization?.taxId) {
      updates.taxId = formData.taxId?.trim() || undefined;
    }
    if (formData.status && formData.status !== organization?.status) {
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

  const onTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTaxId(e.target.value);
    setFormData({ ...formData, taxId: formatted });
  };

  return (
    <Modal
      isOpen={!!organization}
      onClose={handleClose}
      title="Edit Tenant Policy"
      description="Update organization parameters and operational status"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Corporate Identity"
            placeholder="Acme Collection Agency"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
          />

          <Input
            label="Platform Descriptor"
            placeholder="Acme (Optional)"
            value={formData.displayName || ''}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            helperText="Friendly identifier shown in-platform"
          />

          <Select
            label="Business Classification"
            options={organizationTypeOptions}
            value={formData.organizationType || ''}
            onChange={(e) => setFormData({ ...formData, organizationType: e.target.value as OrganizationType })}
            error={errors.organizationType}
            required
          />

          <Select
            label="Operational Status"
            options={organizationStatusOptions}
            value={formData.status || ''}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as OrganizationStatus })}
            required
          />

          <Input
            label="Fiscal Identifier (EIN)"
            placeholder="00-0000000"
            value={formData.taxId || ''}
            onChange={onTaxIdChange}
            error={errors.taxId}
            maxLength={10}
            helperText="Format: XX-XXXXXXX"
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
            Commit Policy Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}