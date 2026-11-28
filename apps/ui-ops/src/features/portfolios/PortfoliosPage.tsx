import { useQuery } from '@tanstack/react-query';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { portfolioService } from '../../shared/services/portfolioService.js';
import { Briefcase, CheckCircle, XCircle, Clock, Plus, DollarSign } from 'lucide-react';
import { Card } from '../../shared/components/Card.js';
import { Badge, StatusBadge } from '../../shared/components/Badge.js';
import { StatsCard } from '../../shared/components/StatsCard.js';
import { StatsGrid } from '../../shared/components/StatsGrid.js';
import { FilterBar } from '../../shared/components/FilterBar.js';
import { Button } from '../../shared/components/Button.js';
import { SelectOption } from '../../shared/components/Select.js';
import { useState, useEffect } from 'react';
import { PortfolioStatus, PortfolioResponseDto } from '../../api/generated/debts_models/index.js';
import { getErrorMessage } from '../../shared/utils/errors.js';
import { CreatePortfolioForm } from './components/CreatePortfolioForm.js';
import { PortfolioDetailsModal } from './components/PortfolioDetailsModal.js';
import { EditPortfolioForm } from './components/EditPortfolioForm.js';
import { useAuthStore } from '../../shared/store/authStore.js';

export function Portfolios() {
  const navigate = useNavigate();
  const organizationId = useAuthStore((state) => state.organization?.id);
  const search = useSearch({ from: '/portfolios' }) as { action?: string };
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PortfolioStatus | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioResponseDto | null>(null);

  // Open create modal if action=create in URL
  useEffect(() => {
    if (search.action === 'create') {
      setIsCreateModalOpen(true);
      // Clear the search param after opening modal
      navigate({ to: '/portfolios', search: undefined, replace: true });
    }
  }, [search.action, navigate]);

  // Note: Platform admins may not have access to portfolios (organization-scoped resource)
  const { data: portfoliosData, isLoading, error } = useQuery({
    queryKey: ['portfolios'],
    queryFn: () => portfolioService.listPortfolios(organizationId!, { page: 1, pageSize: 100 }),
    enabled: !!organizationId,
  });

  const portfolios: PortfolioResponseDto[] = portfoliosData?.data || [];
  const filteredPortfolios = portfolios.filter((portfolio: PortfolioResponseDto) => {
    const matchesSearch = portfolio.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          portfolio.source.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || portfolio.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    total: portfolios.length,
    active: portfolios.filter((p: PortfolioResponseDto) => p.status === PortfolioStatus.ACTIVE).length,
    provisioning: portfolios.filter((p: PortfolioResponseDto) => p.status === PortfolioStatus.PROVISIONING).length,
    closed: portfolios.filter((p: PortfolioResponseDto) => p.status === PortfolioStatus.CLOSED).length,
  };

  const totalValue = portfolios.reduce((sum, p) => sum + parseFloat(p.totalCurrentBalance || '0'), 0);

  const statusFilterOptions: SelectOption[] = [
    { value: 'all', label: 'All Statuses' },
    { value: PortfolioStatus.ACTIVE, label: 'Active' },
    { value: PortfolioStatus.PROVISIONING, label: 'Provisioning' },
    { value: PortfolioStatus.SOLD, label: 'Sold' },
    { value: PortfolioStatus.CLOSED, label: 'Closed' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Portfolios</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage platform debt portfolios</p>
        </div>
        <StatsGrid columns={4}>
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-[var(--color-card)] rounded-xl animate-pulse border border-[var(--color-border)]" />)}
        </StatsGrid>
      </div>
    );
  }

  if (error) {
    const errorMessage = getErrorMessage(error, 'Unknown error');
    const isForbidden = errorMessage.toLowerCase().includes('forbidden') || errorMessage.includes('403');

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <div className="p-4 rounded-full bg-amber-500/10 w-fit mx-auto">
            <Briefcase className="w-12 h-12 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {isForbidden ? 'Authorization Required' : 'Synchronization Failed'}
          </h2>
          <p className="text-xs text-[var(--color-muted-foreground)] font-medium leading-relaxed">
            {isForbidden
              ? 'Portfolios are organization-scoped resources. Platform admins must impersonate an organization user or switch context to manage specific portfolio assets.'
              : errorMessage
            }
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate({ to: '/organizations' })}>
            Return to Organizations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Master Portfolios
            </h1>
            <p className="text-[10px] text-[var(--color-muted-foreground)] font-black uppercase tracking-widest mt-1">System-wide Portfolio Management</p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          icon={Plus}
          size="sm"
        >
          New Asset Portfolio
        </Button>
      </div>

      {/* Stats Overview */}
      <StatsGrid columns={4}>
        <StatsCard
          title="Total Count"
          value={statusCounts.total}
          icon={Briefcase}
          gradient="primary"
        />
        <StatsCard
          title="Active Assets"
          value={statusCounts.active}
          icon={CheckCircle}
          gradient="success"
        />
        <StatsCard
          title="In Queue"
          value={statusCounts.provisioning}
          icon={Clock}
          gradient="warning"
        />
        <StatsCard
          title="Global Valuation"
          value={`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          gradient="info"
        />
      </StatsGrid>

      {/* Content Area */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
          <FilterBar
            searchValue={searchQuery}
            searchPlaceholder="Search portfolios by name or source..."
            onSearchChange={setSearchQuery}
            onSearchClear={() => setSearchQuery('')}
            filters={[
              {
                label: 'Status',
                value: statusFilter,
                options: statusFilterOptions,
                onChange: (value) => setStatusFilter(value as PortfolioStatus | 'all'),
              },
            ]}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--color-muted)]/10 text-left">
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)]">Portfolio Identity</th>
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)]">Health</th>
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)]">Debt Count</th>
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)] text-right">Market Valuation</th>
                <th className="p-4 text-[10px] font-black text-[var(--color-muted-foreground)] uppercase tracking-widest border-b border-[var(--color-border)] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {filteredPortfolios.map((portfolio) => (
                <tr
                  key={portfolio.id}
                  className="hover:bg-[var(--color-muted)]/20 transition-colors group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-foreground)] font-bold text-xs border border-[var(--color-border)]">
                        {portfolio.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{portfolio.name}</p>
                        <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-tight line-clamp-1">{portfolio.source}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={portfolio.status} variant="outlined" />
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" size="sm" icon={<Briefcase size={10} />}>
                      {portfolio.debtCount}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <p className="text-sm font-bold text-foreground font-mono">
                      ${parseFloat(portfolio.totalCurrentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-tight">
                      Price: ${parseFloat(portfolio.purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPortfolioId(portfolio.id)}
                      >
                        Assets
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingPortfolio(portfolio)}
                      >
                        Edit
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPortfolios.length === 0 && (
            <div className="text-center py-16">
              <div className="p-4 rounded-full bg-[var(--color-muted)] w-fit mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">No portfolios found</h3>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your active filters</p>
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <CreatePortfolioForm
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <PortfolioDetailsModal
        portfolioId={selectedPortfolioId}
        onClose={() => setSelectedPortfolioId(null)}
        onEdit={(portfolio) => setEditingPortfolio(portfolio)}
      />
      <EditPortfolioForm
        portfolio={editingPortfolio}
        onClose={() => setEditingPortfolio(null)}
      />
    </div>
  );
}