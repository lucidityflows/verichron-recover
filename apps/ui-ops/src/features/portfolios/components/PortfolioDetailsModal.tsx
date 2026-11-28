import { useQuery } from '@tanstack/react-query';
import { portfolioService } from '../../../shared/services/portfolioService.js';
import { PortfolioResponseDto } from '../../../api/generated/debts_models/index.js';
import { Modal } from '../../../shared/components/Modal.js';
import { Briefcase, DollarSign, Calendar, Building2, FileText, TrendingUp } from 'lucide-react';
import { Button } from '../../../shared/components/Button.js';
import { StatusBadge } from '../../../shared/components/Badge.js';
import { Badge } from '../../../shared/components/Badge.js';
import { useAuthStore } from '../../../shared/store/authStore.js';

interface PortfolioDetailsModalProps {
  portfolioId: string | null;
  onClose: () => void;
  onEdit?: (portfolio: PortfolioResponseDto) => void;
}

export function PortfolioDetailsModal({ portfolioId, onClose, onEdit }: PortfolioDetailsModalProps) {
  const organizationId = useAuthStore((state) => state.organization?.id);
  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['portfolio', portfolioId],
    queryFn: () => portfolioService.getPortfolioById(organizationId!, portfolioId!),
    enabled: !!portfolioId && !!organizationId,
  });

  if (!portfolioId) return null;

  const calculateReturnRate = (currentBalance: string, purchasePrice: string) => {
    const current = parseFloat(currentBalance);
    const purchase = parseFloat(purchasePrice);
    if (purchase === 0) return '0.00';
    return (((current - purchase) / purchase) * 100).toFixed(2);
  };

  return (
    <Modal
      isOpen={!!portfolioId}
      onClose={onClose}
      title="Portfolio Details"
      description="View portfolio information and performance metrics"
      size="xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : portfolio ? (
        <div className="space-y-6">
          {/* Portfolio Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {portfolio.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">{portfolio.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{portfolio.source}</p>
                <div className="mt-2">
                  <StatusBadge status={portfolio.status} variant="outlined" />
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Debt Count */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Briefcase className="w-4 h-4" />
                <span className="text-sm font-medium">Total Debts</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{portfolio.debtCount}</p>
            </div>

            {/* Purchase Price */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Purchase Price</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">
                ${parseFloat(portfolio.purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Total Principal */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Total Principal</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">
                ${parseFloat(portfolio.totalPrincipal).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Current Balance */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Current Balance</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">
                ${parseFloat(portfolio.totalCurrentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* Purchase Date */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Purchase Date</span>
              </div>
              <p className="text-foreground text-sm">
                {new Date(portfolio.purchaseDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Organization ID */}
            <div className="p-4 rounded-lg border border-border/50 bg-card">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">Organization</span>
              </div>
              <code className="text-xs text-foreground font-mono bg-muted px-2 py-1 rounded">
                {portfolio.organizationId.substring(0, 16)}...
              </code>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="p-4 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Performance Metrics
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Return Rate</p>
                <p className="text-xl font-bold text-foreground mt-1">
                  {calculateReturnRate(portfolio.totalCurrentBalance, portfolio.purchasePrice)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Value Difference</p>
                <p className="text-xl font-bold text-foreground mt-1 font-mono">
                  ${(parseFloat(portfolio.totalCurrentBalance) - parseFloat(portfolio.purchasePrice)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Created:</span>{' '}
              <span className="text-foreground">
                {new Date(portfolio.createdAt).toLocaleString('en-US')}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Last Updated:</span>{' '}
              <span className="text-foreground">
                {new Date(portfolio.updatedAt).toLocaleString('en-US')}
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
                  onEdit(portfolio);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-accent text-white font-semibold hover:shadow-lg transition-all cursor-pointer"
              >
                Edit Portfolio
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Portfolio not found</p>
        </div>
      )}
    </Modal>
  );
}
