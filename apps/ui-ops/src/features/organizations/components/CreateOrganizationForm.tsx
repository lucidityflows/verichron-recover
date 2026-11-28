import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '../../../shared/services/organizationService.js';
import { 
  OrganizationType, 
  ProvisionOrganizationDto,
  InitialAdminUserDto
} from '../../../api/generated/organizations_models/index.js';
import { Input } from '../../../shared/components/Input.js';
import { Select, SelectOption } from '../../../shared/components/Select.js';
import { Button } from '../../../shared/components/Button.js';
import { Modal } from '../../../shared/components/Modal.js';
import { Card } from '../../../shared/components/Card.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { validateField, formatTaxId } from '../../../shared/utils/validation.js';
import { User, Building2 } from 'lucide-react';

interface CreateOrganizationFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const organizationTypeOptions: SelectOption[] = [
  { value: OrganizationType.COLLECTION_AGENCY, label: 'Collection Agency' },
  { value: OrganizationType.CREDITOR, label: 'Creditor' },
  { value: OrganizationType.PARTNER, label: 'Partner' },
];

export function CreateOrganizationForm({ isOpen, onClose }: CreateOrganizationFormProps) {
  const queryClient = useQueryClient();
  
  const [orgData, setOrgData] = useState({
    name: '',
    displayName: '',
    organizationType: '' as OrganizationType,
    taxId: '',
  });

  const [adminData, setAdminData] = useState<InitialAdminUserDto>({
    firstName: '',
    lastName: '',
    email: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const provisionMutation = useMutation({
    mutationFn: (data: ProvisionOrganizationDto) => organizationService.provisionOrganization(data),
    onSuccess: () => {
      toast.success('Tenant provisioning initiated successfully');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      handleClose();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to provision organization');
      toast.error(message);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Org validations
    const nameValidation = validateField(orgData.name, {
      required: true,
      minLength: 2,
      custom: (val) => /^[a-zA-Z0-9\s'-]+$/.test(val),
      customMessage: 'Only alphanumeric characters, spaces, hyphens, and apostrophes allowed'
    });
    if (!nameValidation.isValid) newErrors.name = nameValidation.error!;

    if (!orgData.organizationType) newErrors.organizationType = 'Selection required';

    const taxIdValidation = validateField(orgData.taxId, {
      required: true,
      taxId: true,
    });
    if (!taxIdValidation.isValid) newErrors.taxId = taxIdValidation.error!;

    // Admin validations
    const firstNameValidation = validateField(adminData.firstName, { required: true, minLength: 2 });
    if (!firstNameValidation.isValid) newErrors.firstName = firstNameValidation.error!;

    const lastNameValidation = validateField(adminData.lastName, { required: true, minLength: 2 });
    if (!lastNameValidation.isValid) newErrors.lastName = lastNameValidation.error!;

    const emailValidation = validateField(adminData.email, { required: true, email: true });
    if (!emailValidation.isValid) newErrors.email = emailValidation.error!;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Form validation failed. Please check required fields.');
      return;
    }

    const payload: ProvisionOrganizationDto = {
      organization: {
        name: orgData.name.trim(),
        organizationType: orgData.organizationType,
        displayName: orgData.displayName?.trim() || undefined,
        taxId: orgData.taxId.trim(),
      },
      initialAdmin: {
        firstName: adminData.firstName.trim(),
        lastName: adminData.lastName.trim(),
        email: adminData.email.trim().toLowerCase(),
      }
    };

    provisionMutation.mutate(payload);
  };

  const handleClose = () => {
    setOrgData({
      name: '',
      displayName: '',
      organizationType: '' as OrganizationType,
      taxId: '',
    });
    setAdminData({
      firstName: '',
      lastName: '',
      email: '',
    });
    setErrors({});
    onClose();
  };

  const onTaxIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTaxId(e.target.value);
    setOrgData({ ...orgData, taxId: formatted });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Provision New Tenant"
      description="Add a new client organization and its initial administrator"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Section 1: Organization */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Organization Details</h3>
            </div>
            
            <div className="space-y-4">
              <Input
                label="Legal Corporate Name"
                placeholder="Acme Collection Agency"
                value={orgData.name}
                onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                error={errors.name}
                required
              />

              <Input
                label="Platform Friendly Name"
                placeholder="Acme (Optional)"
                value={orgData.displayName}
                onChange={(e) => setOrgData({ ...orgData, displayName: e.target.value })}
                helperText="Identifier shown in dashboard headers"
              />

              <Select
                label="Business Classification"
                placeholder="Select Classification..."
                options={organizationTypeOptions}
                value={orgData.organizationType}
                onChange={(e) => setOrgData({ ...orgData, organizationType: e.target.value as OrganizationType })}
                error={errors.organizationType}
                required
              />

              <Input
                label="Tax Identifier (EIN)"
                placeholder="00-0000000"
                value={orgData.taxId}
                onChange={onTaxIdChange}
                error={errors.taxId}
                required
                maxLength={10}
                helperText="Strict XX-XXXXXXX format required"
              />
            </div>
          </div>

          {/* Section 2: Administrator */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <User className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Initial Administrator</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  placeholder="Jane"
                  value={adminData.firstName}
                  onChange={(e) => setAdminData({ ...adminData, firstName: e.target.value })}
                  error={errors.firstName}
                  required
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={adminData.lastName}
                  onChange={(e) => setAdminData({ ...adminData, lastName: e.target.value })}
                  error={errors.lastName}
                  required
                />
              </div>

              <Input
                label="Administrative Email"
                placeholder="admin@verichroninc.com"
                type="email"
                value={adminData.email}
                onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                error={errors.email}
                required
                helperText="Login credentials will be sent to this address"
              />

              <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10">
                <p className="text-[10px] text-blue-500 font-bold uppercase leading-relaxed">
                  Platform Security Note:
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                  Provisioning a tenant automatically creates a root administrator with full access to the organization's data and configuration.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={provisionMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={provisionMutation.isPending}
          >
            Finalize Provisioning
          </Button>
        </div>
      </form>
    </Modal>
  );
}