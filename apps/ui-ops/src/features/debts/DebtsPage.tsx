import { useQuery } from '@tanstack/react-query';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { debtService } from '../../shared/services/debtService.js';
import { Receipt, CheckCircle, Clock, Plus, DollarSign, AlertCircle } from 'lucide-react';
import { Card, CardVariant } from '../../shared/components/Card.js';
import { StatusBadge } from '../../shared/components/Badge.js';
import { StatsCard } from '../../shared/components/StatsCard.js';
import { StatsGrid } from '../../shared/components/StatsGrid.js';
import { FilterBar } from '../../shared/components/FilterBar.js';
import { Button, ButtonVariant } from '../../shared/components/Button.js';
import { SelectOption } from '../../shared/components/Select.js';
import { useState, useEffect } from 'react';
import { DebtStatus, DebtResponseDto } from '../../api/generated/debts_models/index.js';
import { getErrorMessage } from '../../shared/utils/errors.js';
import { CreateDebtForm } from './components/CreateDebtForm.js';
import { DebtDetailsModal } from './components/DebtDetailsModal.js';
import { EditDebtForm } from './components/EditDebtForm.js';

export function Debts() {
  const navigate = useNavigate();
  const search = useSearch({ from: '/debts' }) as { action?: string };
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DebtStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [editingDebt, setEditingDebt] = useState<DebtResponseDto | null>(null);

  // Open create modal if action=create in URL
  useEffect(() => {
    if (search.action === 'create') {
      setIsCreateModalOpen(true);
      // Clear the search param after opening modal
      navigate({ to: '/debts', search: undefined, replace: true });
    }
  }, [search.action, navigate]);

  // Note: Platform admins may not have access to debts (organization-scoped resource)
  const { data: debtsData, isLoading, error } = useQuery({
    queryKey: ['debts'],
    queryFn: () => debtService.listDebts({ page: 1, pageSize: 100 }),
  });

  const debts: DebtResponseDto[] = debtsData?.data || [];
  const filteredDebts = debts.filter((debt: DebtResponseDto) => {
    const matchesSearch = debt.originalCreditorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          debt.accountNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    total: debts.length,
    active: debts.filter((d: DebtResponseDto) => d.status === DebtStatus.ACTIVE).length,
    inCollection: debts.filter((d: DebtResponseDto) => d.status === DebtStatus.IN_COLLECTION).length,
    settled: debts.filter((d: DebtResponseDto) => d.status === DebtStatus.SETTLED).length,
  };

  const totalBalance = debts.reduce((sum, d) => sum + parseFloat(d.currentBalance || '0'), 0);

  const getStatusIcon = (status: DebtStatus) => {
    switch (status) {
      case DebtStatus.ACTIVE:
      case DebtStatus.IN_COLLECTION:
      case DebtStatus.PAYMENT_PLAN:
        return <Clock className="w-5 h-5" />;
      case DebtStatus.SETTLED:
      case DebtStatus.PAID_IN_FULL:
        return <CheckCircle className="w-5 h-5" />;
      case DebtStatus.CHARGED_OFF:
        return <AlertCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const statusFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All Statuses' },
    { value: DebtStatus.IMPORTED, label: 'Imported' },
    { value: DebtStatus.ACTIVE, label: 'Active' },
    { value: DebtStatus.IN_COLLECTION, label: 'In Collection' },
    { value: DebtStatus.PAYMENT_PLAN, label: 'Payment Plan' },
    { value: DebtStatus.SETTLED, label: 'Settled' },
    { value: DebtStatus.PAID_IN_FULL, label: 'Paid In Full' },
    { value: DebtStatus.SOLD, label: 'Sold' },
    { value: DebtStatus.CHARGED_OFF, label: 'Charged Off' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading debts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorMessage = getErrorMessage(error, 'Unknown error');
    const isForbidden = errorMessage.toLowerCase().includes('forbidden') || errorMessage.includes('403');

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <Receipt className="w-12 h-12 text-warning mx-auto" />
          <p className="text-warning font-semibold">
            {isForbidden ? 'Access Restricted' : 'Failed to load debts'}
          </p>
          <p className="text-muted-foreground text-sm">
            {isForbidden
              ? 'Debts are organization-scoped resources. Platform admins need to impersonate an organization user or switch to an organization context to view debts.'
              : errorMessage
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Debts
          </h1>
          <p className="text-muted-foreground mt-2">Manage individual debt records across all portfolios</p>
        </div>
        <Button
          variant={ButtonVariant.PRIMARY}
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<Plus className="w-5 h-5" />}
        >
          New Debt
        </Button>
      </div>

      {/* Stats Overview */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total Debts"
          value={statusCounts.total}
          icon={Receipt}
          gradient="primary"
        />
        <StatsCard
          title="Active"
          value={statusCounts.active}
          icon={Clock}
          gradient="info"
        />
        <StatsCard
          title="In Collection"
          value={statusCounts.inCollection}
          icon={AlertCircle}
          gradient="warning"
        />
        <StatsCard
          title="Total Balance"
          value={`$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          gradient="success"
        />
      </StatsGrid>

      {/* Filters */}
      <Card variant={CardVariant.GRADIENT}>
        <FilterBar
          searchValue={searchQuery}
          searchPlaceholder="Search debts by creditor or account number..."
          onSearchChange={setSearchQuery}
          onSearchClear={() => setSearchQuery('')}
          filters={[
            {
              label: 'Status',
              value: statusFilter,
              options: statusFilterOptions,
              onChange: (value) => setStatusFilter(value as DebtStatus | 'all'),
            },
          ]}
        />
      </Card>

      {/* Debts Table */}
      <Card variant={CardVariant.GLASS}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Creditor</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Account</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Principal</th>
                <th className="text-right p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Current Balance</th>
                <th className="text-left p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Debt Date</th>
                <th className="text-right p-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebts.map((debt) => (
                <tr
                  key={debt.id}
                  className="border-b border-border/30 hover:bg-muted/30 transition-colors group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                        {debt.originalCreditorName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{debt.originalCreditorName}</p>
                        <p className="text-xs text-muted-foreground">ID: {debt.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <code className="text-sm font-mono text-foreground">{debt.accountNumber}</code>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={debt.status} variant="outlined" icon={getStatusIcon(debt.status)} />
                  </td>
                  <td className="p-4 text-right text-foreground font-mono">
                    ${parseFloat(debt.principalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-right text-foreground font-mono">
                    ${parseFloat(debt.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-foreground">
                    {new Date(debt.originalDebtDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedDebtId(debt.id)}
                        className="px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        onClick={() => setEditingDebt(debt)}
                        className="px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDebts.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No debts found</p>
            </div>
          )}
        </div>
      </Card>

      {/* Create Debt Modal */}
      <CreateDebtForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* View Debt Details Modal */}
      <DebtDetailsModal
        debtId={selectedDebtId}
        onClose={() => setSelectedDebtId(null)}
        onEdit={(debt) => setEditingDebt(debt)}
      />

      {/* Edit Debt Modal */}
      <EditDebtForm
        debt={editingDebt}
        onClose={() => setEditingDebt(null)}
      />
    </div>
  );
}
