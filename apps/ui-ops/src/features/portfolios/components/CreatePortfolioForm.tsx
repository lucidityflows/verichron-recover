import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '../../../shared/services/portfolioService.js';
import { CreatePortfolioDto, PortfolioStatus } from '../../../api/generated/debts_models/index.js';
import { Modal } from '../../../shared/components/Modal.js';
import { Button, ButtonVariant, ButtonSize } from '../../../shared/components/Button.js';
import { Input } from '../../../shared/components/Input.js';
import { Select, SelectOption } from '../../../shared/components/Select.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { useAuthStore } from '../../../shared/store/authStore.js';

interface CreatePortfolioFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions: SelectOption[] = [
  { value: PortfolioStatus.PROVISIONING, label: 'Provisioning' },
  { value: PortfolioStatus.ACTIVE, label: 'Active' },
  { value: PortfolioStatus.SOLD, label: 'Sold' },
  { value: PortfolioStatus.CLOSED, label: 'Closed' },
];

export function CreatePortfolioForm({ isOpen, onClose }: CreatePortfolioFormProps) {
  const queryClient = useQueryClient();
  const organizationId = useAuthStore((state) => state.organization?.id);
  const [formData, setFormData] = useState<CreatePortfolioDto>({
    name: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: 0,
    totalPrincipal: 0,
    source: '',
    status: PortfolioStatus.PROVISIONING,
  });

  const createMutation = useMutation({
    mutationFn: (dto: CreatePortfolioDto) => {
      if (!organizationId) throw new Error('Organization context is required');
      return portfolioService.createPortfolio(organizationId, dto);
    },
    onSuccess: () => {
      toast.success('Portfolio created successfully!');
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      handleClose();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to create portfolio');
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.source || formData.purchasePrice < 0 || formData.totalPrincipal < 0) {
      toast.error('Please fill in all required fields correctly');
      return;
    }

    createMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: 0,
      totalPrincipal: 0,
      source: '',
      status: PortfolioStatus.PROVISIONING,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Portfolio"
      description="Add a new debt portfolio to the platform"
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

        <Input
          label="Source"
          value={formData.source}
          onChange={(e) => setFormData({ ...formData, source: e.target.value })}
          placeholder="e.g., ABC Financial Services"
          helperText="Origin/creditor of the portfolio"
          required
          maxLength={500}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Purchase Price ($)"
            type="number"
            step="0.01"
            min="0"
            value={formData.purchasePrice}
            onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            required
          />

          <Input
            label="Total Principal ($)"
            type="number"
            step="0.01"
            min="0"
            value={formData.totalPrincipal}
            onChange={(e) => setFormData({ ...formData, totalPrincipal: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            helperText="Sum of all debt principals"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Purchase Date"
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            required
          />

          <Select
            label="Status"
            value={formData.status || PortfolioStatus.PROVISIONING}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as PortfolioStatus })}
            options={statusOptions}
          />
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
            {createMutation.isPending ? 'Creating...' : 'Create Portfolio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
