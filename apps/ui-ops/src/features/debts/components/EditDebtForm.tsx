import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { debtService } from '../../../shared/services/debtService.js';
import { UpdateDebtDto, DebtResponseDto, DebtStatus } from '../../../api/generated/debts_models/index.js';
import { Modal } from '../../../shared/components/Modal.js';
import { Button, ButtonVariant, ButtonSize } from '../../../shared/components/Button.js';
import { Select, SelectOption } from '../../../shared/components/Select.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';

interface EditDebtFormProps {
  debt: DebtResponseDto | null;
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

export function EditDebtForm({ debt, onClose }: EditDebtFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UpdateDebtDto>({
    status: DebtStatus.IMPORTED,
  });

  useEffect(() => {
    if (debt) {
      setFormData({
        status: debt.status,
      });
    }
  }, [debt]);

  const updateMutation = useMutation({
    mutationFn: (dto: UpdateDebtDto) => debtService.updateDebt(debt!.id, dto),
    onSuccess: () => {
      toast.success('Debt updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['debt', debt!.id] });
      handleClose();
    },
    onError: (error) => {
      const message = getErrorMessage(error, 'Failed to update debt');
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleClose = () => {
    setFormData({
      status: DebtStatus.IMPORTED,
    });
    onClose();
  };

  if (!debt) return null;

  return (
    <Modal
      isOpen={!!debt}
      onClose={handleClose}
      title="Edit Debt"
      description={`Update debt ${debt.accountNumber}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Status"
          value={formData.status || DebtStatus.IMPORTED}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as DebtStatus })}
          options={statusOptions}
        />

        <div className="bg-muted/30 p-4 rounded-lg space-y-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Original Creditor:</span> {debt.originalCreditorName}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Account Number:</span> {debt.accountNumber}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Principal:</span> ${parseFloat(debt.principalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Current Balance:</span> ${parseFloat(debt.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Note: Financial details and creditor information cannot be modified after creation for audit compliance.
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
