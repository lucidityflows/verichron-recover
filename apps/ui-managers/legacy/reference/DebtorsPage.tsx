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
import { debtorsService } from '@/shared/services/debtorsService';
import {
  DebtorProfileEntity,
  DebtorProfileEntityVerificationStatus as VerificationStatus,
} from '@/api/generated/debtors_models';
import { Users, UserCheck, UserX, Plus, Eye, Mail } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  verified: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  pending: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  unverified: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
  failed: 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
};

export function DebtorsPage() {
  const { data: debtorsData, isLoading, error } = useQuery({
    queryKey: ['debtors'],
    queryFn: () => debtorsService.listDebtors({ page: 1, pageSize: 100 }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const debtors = debtorsData?.data || [];

  // Calculate stats
  const stats = useMemo(() => {
    const totalDebtors = debtors.length;
    const verifiedDebtors = debtors.filter(
      (d) => d.verificationStatus === VerificationStatus.verified
    ).length;
    const pendingVerification = debtors.filter(
      (d) => d.verificationStatus === VerificationStatus.pending
    ).length;
    const unverified = totalDebtors - verifiedDebtors - pendingVerification;

    return {
      totalDebtors,
      verifiedDebtors,
      pendingVerification,
      unverified,
    };
  }, [debtors]);

  const columns: Column<DebtorProfileEntity>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Debtor',
        render: (debtor) => (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold">
              {debtor.firstName[0]}
              {debtor.lastName[0]}
            </div>
            <div>
              <p className="font-medium text-[var(--color-foreground)]">
                {debtor.firstName} {debtor.middleName ? `${debtor.middleName} ` : ''}
                {debtor.lastName}
              </p>
              <p className="text-sm text-muted-foreground">ID: {debtor.id.substring(0, 8)}</p>
            </div>
          </div>
        ),
      },
      {
        key: 'dateOfBirth',
        header: 'Date of Birth',
        render: (debtor) =>
          debtor.dateOfBirth ? new Date(debtor.dateOfBirth).toLocaleDateString() : 'Not provided',
        className: 'whitespace-nowrap text-sm text-[var(--color-foreground)]',
      },
      {
        key: 'verificationStatus',
        header: 'Verification Status',
        render: (debtor) => (
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full ${
              STATUS_COLORS[debtor.verificationStatus] ||
              'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]'
            }`}
          >
            {debtor.verificationStatus.replace(/_/g, ' ').toUpperCase()}
          </span>
        ),
        className: 'whitespace-nowrap',
      },
      {
        key: 'notes',
        header: 'Notes',
        render: (debtor) =>
          debtor.notes ? (
            <p className="text-sm text-[var(--color-foreground)] max-w-xs truncate">{debtor.notes}</p>
          ) : (
            <span className="text-sm text-muted-foreground">No notes</span>
          ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        render: (debtor) => new Date(debtor.createdAt).toLocaleDateString(),
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
              <Mail className="w-4 h-4" />
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
    return <ErrorState title="Failed to load debtors" message={errorMessage} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-down">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-foreground)]">Debtors</h1>
          <p className="text-muted-foreground mt-1">Manage debtor information and communication</p>
        </div>
        <Button icon={Plus}>Add Debtor</Button>
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
                title="Total Debtors"
                value={stats.totalDebtors}
                icon={Users}
                trend={{ value: 'In your organization', positive: true }}
              />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <StatsCard
                title="Verified"
                value={stats.verifiedDebtors}
                icon={UserCheck}
                trend={{
                  value: `${stats.totalDebtors > 0 ? ((stats.verifiedDebtors / stats.totalDebtors) * 100).toFixed(1) : 0}% of total`,
                  positive: true,
                }}
              />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <StatsCard
                title="Pending Verification"
                value={stats.pendingVerification}
                icon={UserX}
                trend={{ value: 'Requires review', positive: false }}
              />
            </div>
            <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <StatsCard
                title="Unverified"
                value={stats.unverified}
                icon={UserX}
                trend={{ value: 'Not yet verified', positive: false }}
              />
            </div>
          </>
        )}
      </StatsGrid>

      {/* Debtors Table */}
      <div className="animate-fade-in-up animation-delay-500">
        <DataTable
          columns={columns}
          data={debtors}
          isLoading={isLoading}
          title="All Debtors"
          emptyState={{
            icon: Users,
            title: 'No debtors found',
            description: 'Add your first debtor to get started',
          }}
          getRowKey={(debtor) => debtor.id}
          loadingMessage="Loading debtors..."
        />
      </div>
    </div>
  );
}
