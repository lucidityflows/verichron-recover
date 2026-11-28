import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { useAutoAssignment } from '../hooks/useAutoAssignment.js';
import { useCollectors } from '../../roster/hooks/useCollectors.js';
import { CreateAutoAssignmentDtoStrategy } from '@/api/generated/workflows_models';
import { type PortfolioResponseDto } from '@/api/generated/debts_models';

interface CreateSegmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolios: PortfolioResponseDto[];
}

interface FormData {
  name: string;
  description: string;
  enabled: boolean;
  strategy: CreateAutoAssignmentDtoStrategy;
  portfolioIds: string[];
  minBalance: string;
  maxBalance: string;
  minAge: string;
  maxAge: string;
  collectorPool: string[];
}

const STRATEGIES = [
  { value: CreateAutoAssignmentDtoStrategy.ROUND_ROBIN, label: 'Round Robin', desc: 'Distribute equally' },
  { value: CreateAutoAssignmentDtoStrategy.LEAST_WORKLOAD, label: 'Least Workload', desc: 'Balance active accounts' },
  { value: CreateAutoAssignmentDtoStrategy.SKILL_BASED, label: 'Skill Based', desc: 'Match complexity to skill' },
];

export const CreateSegmentModal: React.FC<CreateSegmentModalProps> = ({ isOpen, onClose, portfolios }) => {
  const { createConfig, isCreating } = useAutoAssignment();
  const { data: collectors = [], isLoading: isLoadingCollectors } = useCollectors();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    enabled: true,
    strategy: CreateAutoAssignmentDtoStrategy.ROUND_ROBIN,
    portfolioIds: [],
    minBalance: '',
    maxBalance: '',
    minAge: '',
    maxAge: '',
    collectorPool: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createConfig({
        name: formData.name,
        description: formData.description,
        enabled: formData.enabled,
        strategy: formData.strategy,
        filters: {
          portfolioIds: formData.portfolioIds.length > 0 ? formData.portfolioIds : undefined,
          balanceRange: (formData.minBalance || formData.maxBalance) 
            ? [Number(formData.minBalance || 0), Number(formData.maxBalance || 999999)] 
            : undefined,
          accountAgeRange: (formData.minAge || formData.maxAge)
            ? [Number(formData.minAge || 0), Number(formData.maxAge || 3650)]
            : undefined,
        },
        collectorPool: formData.collectorPool,
        // Defaults
        maxAssignmentsPerDay: 50,
        workloadThreshold: 200,
        delayMinutes: 0,
      });
      onClose();
    } catch (error) {
      // Handled by hook toast
    }
  };

  const togglePortfolio = (id: string) => {
    setFormData(prev => ({
      ...prev,
      portfolioIds: prev.portfolioIds.includes(id)
        ? prev.portfolioIds.filter(pId => pId !== id)
        : [...prev.portfolioIds, id]
    }));
  };

  const toggleCollector = (id: string) => {
    setFormData(prev => ({
      ...prev,
      collectorPool: prev.collectorPool.includes(id)
        ? prev.collectorPool.filter(cId => cId !== id)
        : [...prev.collectorPool, id]
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Tactical Segment"
      size="lg"
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary rounded-md transition-colors"
            disabled={isCreating}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-md hover:bg-primary-hover transition-colors disabled:opacity-50"
            disabled={isCreating}
          >
            {isCreating && <Loader2 size={16} className="animate-spin" />}
            Create Segment
          </button>
        </div>
      }
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Segment Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              placeholder="e.g. High Value - Legal"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border-border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              rows={2}
              placeholder="Optional description..."
            />
          </div>
        </div>

        {/* Strategy */}
        <div>
          <label className="block text-sm font-medium mb-2">Assignment Strategy</label>
          <div className="grid grid-cols-3 gap-3">
            {STRATEGIES.map(strat => (
              <button
                key={strat.value}
                type="button"
                onClick={() => setFormData({ ...formData, strategy: strat.value })}
                className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                  formData.strategy === strat.value
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
              >
                <span className="text-sm font-bold">{strat.label}</span>
                <span className="text-[10px] text-muted-foreground">{strat.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/20">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Filters</h4>
          
          {/* Portfolios */}
          <div>
            <label className="block text-xs font-medium mb-2">Target Portfolios</label>
            <div className="flex flex-wrap gap-2">
              {portfolios.map(portfolio => (
                <button
                  key={portfolio.id}
                  type="button"
                  onClick={() => togglePortfolio(portfolio.id)}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    formData.portfolioIds.includes(portfolio.id)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary'
                  }`}
                >
                  {portfolio.name}
                </button>
              ))}
              {portfolios.length === 0 && <span className="text-xs text-muted-foreground">No portfolios found.</span>}
            </div>
          </div>

          {/* Balance Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Min Balance ($)</label>
              <input
                type="number"
                value={formData.minBalance}
                onChange={e => setFormData({ ...formData, minBalance: e.target.value })}
                className="w-full rounded-md border-border bg-background px-3 py-1.5 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Max Balance ($)</label>
              <input
                type="number"
                value={formData.maxBalance}
                onChange={e => setFormData({ ...formData, maxBalance: e.target.value })}
                className="w-full rounded-md border-border bg-background px-3 py-1.5 text-sm"
                placeholder="No limit"
              />
            </div>
          </div>
        </div>

        {/* Collector Pool */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">Collector Pool</label>
            <span className="text-xs text-muted-foreground">
              {formData.collectorPool.length} selected
            </span>
          </div>
          
          <div className="border border-border rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
            {isLoadingCollectors ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading collectors...</div>
            ) : collectors.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">No collectors found.</div>
            ) : (
              collectors.map(collector => (
                <label key={collector.id} className="flex items-center gap-3 p-2 hover:bg-secondary rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.collectorPool.includes(collector.id)}
                    onChange={() => toggleCollector(collector.id)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{collector.firstName} {collector.lastName}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">{collector.status}</span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
};
