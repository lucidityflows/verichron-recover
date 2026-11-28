import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '../../../shared/services/portfolioService.js';
import { UpdatePortfolioDto, PortfolioResponseDto, PortfolioStatus } from '../../../api/generated/debts_models/index.js';
import { Modal } from '../../../shared/components/Modal.js';
import { Button, ButtonVariant, ButtonSize } from '../../../shared/components/Button.js';
import { Input } from '../../../shared/components/Input.js';
import { Select, SelectOption } from '../../../shared/components/Select.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { useAuthStore } from '../../../shared/store/authStore.js';

interface EditPortfolioFormProps {
  portfolio: PortfolioResponseDto | null;
  onClose: () => void;
}

const statusOptions: SelectOption[] = [
  { value: PortfolioStatus.PROVISIONING, label: 'Provisioning' },
  { value: PortfolioStatus.ACTIVE, label: 'Active' },
  { value: PortfolioStatus.SOLD, label: 'Sold' },
  { value: PortfolioStatus.CLOSED, label: 'Closed' },
];

export function EditPortfolioForm({ portfolio, onClose }: EditPortfolioFormProps) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((state) => state.organization?.id);
  const [formData, setFormData] = useState<UpdatePortfolioDto>({
    name: '',
    status: PortfolioStatus.PROVISIONING,
  });

  useEffect(() => {
    if (portfolio) {
      setFormData({
        name: portfolio.name,
        status: portfolio.status,
      });
    }
  }, [portfolio]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdatePortfolioDto) => {
      if (!organizationId) throw new Error('Organization context is required');
      return portfolioService.updatePortfolio(organizationId, portfolio!.id, dto);
    },
    onSuccess: () => {
      toast.success('Portfolio updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio', portfolio!.id] });
      handleClose();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update portfolio');
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Portfolio name is required');
      return;
    }

    updateMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      status: PortfolioStatus.PROVISIONING,
    });
    onClose();
  };

  if (!portfolio) return null;

  return (
    <Modal
      isOpen={!!portfolio}
      onClose={handleClose}
      title="Edit Portfolio"
      description={`Update ${portfolio.name} details`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Portfolio Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Medical Debt Portfolio Q1 2024"
          required
          maxLength={255}
        />

        <Select
          label="Status"
          value={formData.status || PortfolioStatus.PROVISIONING}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as PortfolioStatus })}
          options={statusOptions}
        />

        <div className="bg-muted/30 p-4 rounded-lg space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Source:</span> {portfolio.source}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Purchase Price:</span> ${parseFloat(portfolio.purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Total Principal:</span> ${parseFloat(portfolio.totalPrincipal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Purchase Date:</span> {new Date(portfolio.purchaseDate).toLocaleDateString()}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Financial details cannot be modified after creation for audit compliance.
          </p>
        </div>

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
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
