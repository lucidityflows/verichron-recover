import React, { useState } from 'react';
import { 
  Filter, 
  ChevronRight, 
  Users2, 
  Plus, 
  Layers, 
  Trash2, 
  CheckCircle2,
  Package,
  Calculator,
  Loader2,
  Pencil
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useUser } from '../../shared/store/userStore.js';
import { useAutoAssignment } from '../strategy/hooks/useAutoAssignment.js';
import { usePortfolios } from './hooks/usePortfolios.js';
import { CreateSegmentModal } from '../strategy/components/CreateSegmentModal.js';
import { EditSegmentModal } from '../strategy/components/EditSegmentModal.js';
import { type AutoAssignmentConfigResponseDto } from '@/api/generated/workflows_models';

interface Segment {
  id: string;
  name: string;
  criteria: string;
  count: number;
  assignedTeam: string;
}

const FilterSummary: React.FC<{ filters: any }> = ({ filters }) => {
  const parts = [];
  if (filters.portfolioIds?.length > 0) parts.push(`${filters.portfolioIds.length} Portfolios`);
  if (filters.balanceRange) parts.push(`$${filters.balanceRange[0].toLocaleString()}-$${filters.balanceRange[1].toLocaleString()}`);
  if (filters.accountAgeRange) parts.push(`${filters.accountAgeRange[0]}-${filters.accountAgeRange[1]} Days Old`);
  
  if (parts.length === 0) return <span>No specific filters</span>;
  return <span>{parts.join(' • ')}</span>;
};

/**
 * PortfolioSegmentation
 * Allows managers to slice portfolios into granular tactical segments.
 */
export const PortfolioSegmentation: React.FC = () => {
  const { organizationId } = useUser();
  const [activePortfolioId, setActivePortfolioId] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AutoAssignmentConfigResponseDto | null>(null);
  
  // 1. Fetch Data
  const { configs, isLoading: isLoadingConfigs, removeConfig } = useAutoAssignment();
  const { data: portfoliosData, isLoading: isLoadingPortfolios } = usePortfolios({ pageSize: 50 });
  const portfolios = portfoliosData?.data || [];

  // Set default active portfolio if not set
  if (!activePortfolioId && portfolios.length > 0) {
    setActivePortfolioId(portfolios[0].id);
  }

  const selectedPortfolio = portfolios.find(p => p.id === activePortfolioId);

  if (isLoadingConfigs || isLoadingPortfolios) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-medium">Loading segmentation engine...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Inventory</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Segmentation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Tranche Segmentation</h1>
          <p className="text-sm font-medium text-muted-foreground">Slice portfolios into tactical work-segments based on custom rule logic.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95"
          >
            <Plus size={16} />
            Create Segment
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Portfolio Context */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-md space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Portfolio</h3>
              <select
                value={activePortfolioId}
                onChange={(e) => setActivePortfolioId(e.target.value)}
                className="w-full rounded-md border-border bg-card text-sm font-bold text-foreground focus:ring-ring focus:border-ring"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Total Accounts</span>
                <span className="text-xs font-mono font-bold text-foreground">{selectedPortfolio?.debtCount.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Segmented Coverage</span>
                <span className="text-xs font-mono font-bold text-muted-foreground italic">Pending Sync</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-2 rounded-full bg-muted-foreground/20 animate-pulse" style={{ width: '100%' }} />
              </div>
              <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                * Coverage calculation is performed during the nightly optimization cycle or after a manual "Run Segments" trigger.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-xl">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Calculator size={18} />
              <h4 className="text-xs font-bold uppercase tracking-widest">Segmentation ROI</h4>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Segmented portfolios typically see a <span className="text-sidebar-foreground font-bold">14% higher recovery rate</span> by aligning account complexity with specialized collector skills.
            </p>
          </div>
        </div>

        {/* Right: Segments List */}
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tactical Segments ({configs.length})</h3>

          <div className="space-y-3">
            {configs.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
                No tactical segments defined for this organization.
              </div>
            ) : (
              configs.map((config) => (
                <div key={config.id} className="group relative rounded-xl border border-border bg-card p-5 shadow-md hover:border-primary transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Layers size={20} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-foreground">{config.name}</h4>
                        <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">
                          {config.strategy} • <FilterSummary filters={config.filters} />
                        </div>
                        <div className="flex items-center gap-4 pt-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                            <Package size={12} />
                            <span>Active: {config.enabled ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                            <Users2 size={12} />
                            <span className="text-foreground">Pool: {config.collectorPool?.length || 0} Collectors</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingConfig(config)}
                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => removeConfig(config.id)}
                        className="p-2 text-muted-foreground hover:text-error hover:bg-error/10 rounded-md transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/10 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Plus size={18} />
              <span className="text-sm font-bold uppercase tracking-tight">Add Tactical Segment</span>
            </button>
          </div>
        </div>
      </div>
      
      {isCreateModalOpen && (
        <CreateSegmentModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          portfolios={portfolios}
        />
      )}

      {editingConfig && (
        <EditSegmentModal
          isOpen={!!editingConfig}
          onClose={() => setEditingConfig(null)}
          config={editingConfig}
          portfolios={portfolios}
        />
      )}
    </div>
  );
};
