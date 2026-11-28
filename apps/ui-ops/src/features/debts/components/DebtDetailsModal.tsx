import { useQuery } from '@tanstack/react-query';
import { debtService } from '../../../shared/services/debtService.js';
import { DebtResponseDto } from '../../../api/generated/debts_models/index.js';
import { Modal } from '../../../shared/components/Modal.js';
import { Receipt, DollarSign, Calendar, Building2, FileText, Users } from 'lucide-react';
import { Button } from '../../../shared/components/Button.js';
import { StatusBadge } from '../../../shared/components/Badge.js';
import { Badge } from '../../../shared/components/Badge.js';

interface DebtDetailsModalProps {
  debtId: string | null;
  onClose: () => void;
  onEdit?: (debt: DebtResponseDto) => void;
}

export function DebtDetailsModal({ debtId, onClose, onEdit }: DebtDetailsModalProps) {
  const { data: debt, isLoading } = useQuery({
    queryKey: ['debt', debtId],
    queryFn: () => debtService.getDebtById(debtId!),
    enabled: !!debtId,
  });

  if (!debtId) return null;

  return (
    <Modal
      isOpen={!!debtId}
      onClose={onClose}
      title="Debt Details"
      description="View debt information and financial breakdown"
      size="xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : debt ? (
        <div className="space-y-6">
          {/* Debt Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {debt.originalCreditorName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">{debt.originalCreditorName}</h3>
                <p className="text-sm text-muted-foreground mt-1">Account: {debt.accountNumber}</p>
                <div className="mt-2">
                  <StatusBadge status={debt.status} variant="outlined" />
                </div>
              </div>
            </div>
          </div>

          {/* Debt Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Principal Amount */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Principal Amount</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">
                ${parseFloat(debt.principalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Interest Amount */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Interest Amount</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">
                ${parseFloat(debt.interestAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Fees Amount */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Fees Amount</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">
                ${parseFloat(debt.feesAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Current Balance */}
            <div className="p-4 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-center gap-2 text-primary mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Current Balance</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">
                ${parseFloat(debt.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Original Debt Date */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Original Debt Date</span>
              </div>
              <p className="text-foreground text-sm">
                {new Date(debt.originalDebtDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Last Payment Date */}
            {debt.lastPaymentDate && (
              <div className="p-4 rounded-lg border border-border/50 bg-card">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Last Payment Date</span>
                </div>
                <p className="text-foreground text-sm">
                  {new Date(debt.lastPaymentDate as unknown as string).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}
          </div>

          {/* Debtor Profiles */}
          <div className="p-4 rounded-lg border border-border/50 bg-card">
            <div className="flex items-center gap-2 text-foreground mb-3">
              <Users className="w-5 h-5" />
              <h4 className="text-lg font-semibold">Associated Debtor Profiles</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {debt.debtorProfileIds.map((profileId) => (
                <code
                  key={profileId}
                  className="text-xs text-foreground font-mono bg-muted px-3 py-1.5 rounded border border-border"
                >
                  {profileId}
                </code>
              ))}
            </div>
          </div>

          {/* IDs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Portfolio ID</span>
              </div>
              <code className="text-xs text-foreground font-mono bg-muted px-2 py-1 rounded">
                {debt.portfolioId}
              </code>
            </div>

            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">Organization ID</span>
              </div>
              <code className="text-xs text-foreground font-mono bg-muted px-2 py-1 rounded">
                {debt.organizationId}
              </code>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>{' '}
              <span className="text-foreground">
                {new Date(debt.createdAt).toLocaleString('en-US')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated:</span>{' '}
              <span className="text-foreground">
                {new Date(debt.updatedAt).toLocaleString('en-US')}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Close
            </button>
            {onEdit && (
              <button
                onClick={() => {
                  onEdit(debt);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-semibold hover:shadow-lg transition-all cursor-pointer"
              >
                Edit Debt
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Debt not found</p>
        </div>
      )}
    </Modal>
  );
}
