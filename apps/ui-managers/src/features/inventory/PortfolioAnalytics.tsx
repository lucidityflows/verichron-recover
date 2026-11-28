import React, { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Tag, X, Plus } from 'lucide-react';
import { usePortfolioPerformance } from './hooks/usePortfolioPerformance';
import { useUser } from '@/shared/store/userStore';
import { PortfolioPerformanceChart } from './components/PortfolioPerformanceChart';

export const PortfolioAnalytics: React.FC = () => {
  const { portfolioId } = useParams({ from: '/inventory/portfolios/$portfolioId' });
  const navigate = useNavigate();
  const { organizationId } = useUser();

  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  const { data, isLoading, error } = usePortfolioPerformance(organizationId, {
    portfolioId,
  });

  const portfolio = data?.portfolios?.[0];

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary"></div>
          <p className="text-sm font-medium text-muted-foreground">Loading portfolio analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-lg font-bold text-error">Failed to load portfolio</p>
          <p className="text-sm text-muted-foreground">The portfolio may not exist or an error occurred.</p>
          <button
            onClick={() => navigate({ to: '/inventory/portfolios' })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Back to Portfolios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <button
            onClick={() => navigate({ to: '/inventory/portfolios' })}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Portfolios
          </button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {portfolio.portfolioName}
          </h1>
          <p className="text-sm text-muted-foreground font-mono">
            ID: {portfolioId}
          </p>
        </div>

        {/* Tag Management */}
        <div className="bg-card border border-border rounded-lg p-4 min-w-[300px]">
          <div className="flex items-center gap-2 mb-3">
            <Tag size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Tags</h3>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {tags.length === 0 && !isAddingTag && (
              <p className="text-xs text-muted-foreground italic">No tags yet</p>
            )}
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-md border border-primary/20"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:bg-primary/20 rounded-sm p-0.5"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>

          {isAddingTag ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTag();
                  if (e.key === 'Escape') {
                    setIsAddingTag(false);
                    setNewTag('');
                  }
                }}
                placeholder="e.g., high-risk, 2026, Q1"
                className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded hover:bg-primary/90"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setIsAddingTag(false);
                  setNewTag('');
                }}
                className="px-3 py-1 bg-muted text-muted-foreground text-xs font-medium rounded hover:bg-muted/80"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingTag(true)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
            >
              <Plus size={12} />
              Add Tag
            </button>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Total Collected</p>
          <p className="text-2xl font-bold text-foreground">${parseFloat(portfolio.totalCollected).toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Recovery Rate</p>
          <p className="text-2xl font-bold text-foreground">{portfolio.recoveryRate.toFixed(1)}%</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">ROI</p>
          <p className="text-2xl font-bold text-foreground">{portfolio.roi.toFixed(1)}%</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Total Principal</p>
          <p className="text-2xl font-bold text-foreground">${parseFloat(portfolio.totalPrincipal).toLocaleString()}</p>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Portfolio Performance</h2>
        <div className="flex justify-center">
          <PortfolioPerformanceChart
            data={[portfolio]}
            width={Math.min(800, window.innerWidth - 100)}
            height={400}
          />
        </div>
      </div>
    </div>
  );
};
