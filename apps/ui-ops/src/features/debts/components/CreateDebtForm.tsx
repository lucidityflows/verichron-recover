import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { debtService } from '../../../shared/services/debtService.js';
import { portfolioService } from '../../../shared/services/portfolioService.js';
import { CreateDebtDto, DebtStatus } from '../../../api/generated/debts_models/index.js';
import { Modal } from '../../../shared/components/Modal.js';
import { Button, ButtonVariant, ButtonSize } from '../../../shared/components/Button.js';
import { Input } from '../../../shared/components/Input.js';
import { Select, SelectOption } from '../../../shared/components/Select.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { useAuthStore } from '../../../shared/store/authStore.js';

interface CreateDebtFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions: SelectOption[] = [
  { value: DebtStatus.IMPORTED, label: 'Imported' },
  { value: DebtStatus.ACTIVE, label: 'Active' },
  { value: DebtStatus.IN_COLLECTION, label: 'In Collection' },
  { value: DebtStatus.PAYMENT_PLAN, label: 'Payment Plan' },
  { value: DebtStatus.SETTLED, label: 'Settled' },
  { value: DebtStatus.PAID_IN_FULL, label: 'Paid In Full' },
  { value: DebtStatus.SOLD, label: 'Sold' },
  { value: DebtStatus.CHARGED_OFF, label: 'Charged Off' },
];

export function CreateDebtForm({ isOpen, onClose }: CreateDebtFormProps) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((state) => state.organization?.id);
  const [formData, setFormData] = useState<CreateDebtDto>({
    portfolioId: '',
    originalCreditorName: '',
    accountNumber: '',
    principalAmount: 0,
    interestAmount: 0,
    feesAmount: 0,
    originalDebtDate: new Date().toISOString().split('T')[0],
    debtorProfileIds: [],
    status: DebtStatus.IMPORTED,
  });
  const [debtorProfileId, setDebtorProfileId] = useState('');

  // Fetch portfolios for dropdown
  const { data: portfoliosData } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfolioService.listPortfolios(organizationId!, { page: 1, pageSize: 100 }),
    enabled: isOpen && !!organizationId,
  });

  const portfolioOptions: SelectOption[] = portfoliosData?.data?.map(p => ({
    value: p.id,
    label: p.name,
  })) || [];

  const createMutation = useMutation({
    mutationFn: (dto: CreateDebtDto) => {
      if (!organizationId) throw new Error('Organization context is required');
      return debtService.createDebt(organizationId, dto);
    },
    onSuccess: () => {
      toast.success('Debt created successfully!');
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      handleClose();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to create debt');
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.portfolioId || !formData.originalCreditorName || !formData.accountNumber || formData.debtorProfileIds.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    createMutation.mutate(formData);
  };

  const handleAddDebtorProfile = () => {
    if (debtorProfileId && !formData.debtorProfileIds.includes(debtorProfileId)) {
      setFormData({
        ...formData,
        debtorProfileIds: [...formData.debtorProfileIds, debtorProfileId],
      });
      setDebtorProfileId('');
    }
  };

  const handleRemoveDebtorProfile = (id: string) => {
    setFormData({
      ...formData,
      debtorProfileIds: formData.debtorProfileIds.filter(dpId => dpId !== id),
    });
  };

  const handleClose = () => {
    setFormData({
      portfolioId: '',
      originalCreditorName: '',
      accountNumber: '',
      principalAmount: 0,
      interestAmount: 0,
      feesAmount: 0,
      originalDebtDate: new Date().toISOString().split('T')[0],
      debtorProfileIds: [],
      status: DebtStatus.IMPORTED,
    });
    setDebtorProfileId('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Debt"
      description="Add a new debt record to a portfolio"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Portfolio"
          value={formData.portfolioId}
          onChange={(e) => setFormData({ ...formData, portfolioId: e.target.value })}
          options={portfolioOptions}
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Original Creditor Name"
            value={formData.originalCreditorName}
            onChange={(e) => setFormData({ ...formData, originalCreditorName: e.target.value })}
            placeholder="e.g., ABC Bank"
            required
            maxLength={255}
          />

          <Input
            label="Account Number"
            value={formData.accountNumber}
            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
            placeholder="e.g., ACC-12345"
            required
            maxLength={100}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Principal Amount ($)"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.principalAmount}
            onChange={(e) => setFormData({ ...formData, principalAmount: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            required
          />

          <Input
            label="Interest Amount ($)"
            type="number"
            step="0.01"
            min="0"
            value={formData.interestAmount}
            onChange={(e) => setFormData({ ...formData, interestAmount: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />

          <Input
            label="Fees Amount ($)"
            type="number"
            step="0.01"
            min="0"
            value={formData.feesAmount}
            onChange={(e) => setFormData({ ...formData, feesAmount: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Original Debt Date"
            type="date"
            value={formData.originalDebtDate}
            onChange={(e) => setFormData({ ...formData, originalDebtDate: e.target.value })}
            required
          />

          <Select
            label="Status"
            value={formData.status || DebtStatus.IMPORTED}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as DebtStatus })}
            options={statusOptions}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Debtor Profile IDs (at least one required)
          </label>
          <div className="flex gap-2">
            <Input
              value={debtorProfileId}
              onChange={(e) => setDebtorProfileId(e.target.value)}
              placeholder="Enter debtor profile UUID"
            />
            <Button
              type="button"
              variant={ButtonVariant.GHOST}
              onClick={handleAddDebtorProfile}
            >
              Add
            </Button>
          </div>
          {formData.debtorProfileIds.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.debtorProfileIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                  {id.substring(0, 8)}...
                  <button
                    type="button"
                    onClick={() => handleRemoveDebtorProfile(id)}
                    className="hover:text-error cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

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
            {createMutation.isPending ? 'Creating...' : 'Create Debt'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
