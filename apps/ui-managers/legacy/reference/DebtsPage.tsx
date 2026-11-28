import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  StatsCard,
  SkeletonStatsCard,
  StatsGrid,
  DataTable,
  ErrorState,
  Button,
  Column,
} from '@/shared/components';
import { debtsService } from '@/shared/services/debtsService';
import {
  DebtResponseDto,
  DebtStatus,
} from '@/api/generated/debts_models';
import { FileText, DollarSign, AlertCircle, CheckCircle, Plus, Eye, Edit } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  IMPORTED: 'bg-[var(--color-info)]/10 text-[var(--color-info)]',
  ACTIVE: 'bg-[var(--color-info)]/10 text-[var(--color-info)]',
  IN_COLLECTION: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  PAYMENT_PLAN: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  SETTLED: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  PAID_IN_FULL: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  SOLD: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
  CHARGED_OFF: 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
};

export function DebtsPage() {
  const { data: debtsData, isLoading, error } = useQuery({
    queryKey: ['debts'],
    queryFn: () => debtsService.listDebts({ page: 1, pageSize: 100 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const debts = debtsData?.data || [];

  // Calculate stats
  const stats = useMemo(() => {
    const totalBalance = debts.reduce((sum, d) => sum + parseFloat(d.currentBalance), 0);
    const activeDebts = debts.filter((d) => d.status === DebtStatus.ACTIVE).length;
    const paidDebts = debts.filter(
      (d) => d.status === DebtStatus.SETTLED || d.status === DebtStatus.PAID_IN_FULL
    ).length;
    const chargedOffDebts = debts.filter((d) => d.status === DebtStatus.CHARGED_OFF).length;

    return {
      totalBalance,
      activeDebts,
      paidDebts,
      chargedOffDebts,
    };
  }, [debts]);

  const columns: Column<DebtResponseDto>[] = useMemo(
    () => [
      {
        key: 'originalCreditorName',
        header: 'Original Creditor',
        render: (debt) => (
          <div>
            <p className="font-medium text-[var(--color-foreground)]">{debt.originalCreditorName}</p>
            <p className="text-sm text-muted-foreground">ID: {debt.id.substring(0, 8)}</p>
          </div>
        ),
      },
      {
        key: 'accountNumber',
        header: 'Account Number',
        className: 'whitespace-nowrap text-[var(--color-foreground)]',
      },
      {
        key: 'principalAmount',
        header: 'Principal',
        render: (debt) => (
          <p className="font-semibold text-[var(--color-foreground)]">
            ${parseFloat(debt.principalAmount).toLocaleString()}
          </p>
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'currentBalance',
        header: 'Current Balance',
        render: (debt) => (
          <div>
            <p className="font-semibold text-[var(--color-foreground)]">
              ${parseFloat(debt.currentBalance).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Interest: ${parseFloat(debt.interestAmount).toLocaleString()}
            </p>
          </div>
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'status',
        header: 'Status',
        render: (debt) => (
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              STATUS_COLORS[debt.status] || 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
            }`}
          >
            {debt.status.replace(/_/g, ' ')}
          </span>
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'lastPaymentDate',
        header: 'Last Payment',
        render: (debt) =>
          debt.lastPaymentDate
            ? new Date(debt.lastPaymentDate as unknown as string).toLocaleDateString()
            : 'No payments',
        className: 'whitespace-nowrap text-sm text-[var(--color-foreground)]',
      },
      {
        key: 'actions',
        header: 'Actions',
        render: () => (
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-muted-foreground hover:text-[var(--color-primary)] transition-colors">
              <Eye className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-muted-foreground hover:text-[var(--color-primary)] transition-colors">
              <Edit className="w-4 h-4" />
            </button>
          </div>
        ),
        className: 'whitespace-nowrap',
      },
    ],
    []
  );

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return <ErrorState title="Failed to load debts" message={errorMessage} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-down">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-foreground)]">Debts</h1>
          <p className="text-muted-foreground mt-1">Track and manage all outstanding debts</p>
        </div>
        <Button icon={Plus}>Add Debt</Button>
      </div>

      {/* Stats Grid */}
      <StatsGrid columns={4}>
        {isLoading ? (
          <>
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
          </>
        ) : (
          <>
            <div className="animate-fade-in-up" style={{ animationDelay: '0ms' }}>
              <StatsCard
                title="Total Outstanding"
                value={`$${(stats.totalBalance / 1000).toFixed(1)}K`}
                icon={DollarSign}
                trend={{ value: `${debts.length} total debts`, positive: false }}
              />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <StatsCard
                title="Active Debts"
                value={stats.activeDebts}
                icon={FileText}
                trend={{
                  value: `${debts.length > 0 ? ((stats.activeDebts / debts.length) * 100).toFixed(1) : 0}% of total`,
                  positive: false,
                }}
              />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <StatsCard
                title="Paid Debts"
                value={stats.paidDebts}
                icon={CheckCircle}
                trend={{
                  value: `${debts.length > 0 ? ((stats.paidDebts / debts.length) * 100).toFixed(1) : 0}% recovery rate`,
                  positive: true,
                }}
              />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <StatsCard
                title="Charged Off"
                value={stats.chargedOffDebts}
                icon={AlertCircle}
                trend={{ value: 'Requires attention', positive: false }}
              />
            </div>
          </>
        )}
      </StatsGrid>

      {/* Debts Table */}
      <div className="animate-fade-in-up animation-delay-500">
        <DataTable
          columns={columns}
          data={debts}
          isLoading={isLoading}
          title="All Debts"
          emptyState={{
            icon: FileText,
            title: 'No debts found',
            description: 'Add your first debt to get started',
          }}
          getRowKey={(debt) => debt.id}
          loadingMessage="Loading debts..."
        />
      </div>
    </div>
  );
}
