import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  LiquidationCurve,
  OperationalPulse,
  ResourceFriction,
  ControlTowerEmptyState
} from './components/index.js';
import {
  TrendingUp,
  ChevronRight,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Layers,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useManagerDashboard } from './hooks/useManagerDashboard.js';
import { useUser } from '../../shared/store/userStore.js';
import { usePortfolioPerformance } from '../inventory/hooks/usePortfolioPerformance.js';
import { useRealtime } from '../../shared/contexts/RealtimeContext.js';
import { AuditShield } from '../auditing/components/AuditShield.js';

/**
 * Control Tower (v2.0)
 * Strategic Operations Center for Org Admins and Managers.
 * Optimized for "Predictive Command" and "Quiet Power".
 */
export const ControlTower: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId } = useUser();
  const { isConnected } = useRealtime();
  
  const { data: dashboard, isLoading } = useManagerDashboard(organizationId);
  const { data: performance, isLoading: isLoadingPerf, error: perfError } = usePortfolioPerformance(organizationId, {
    pageSize: 10
  });

  // Debug logging
  React.useEffect(() => {
    if (performance) {
      console.log('[ControlTower] Portfolio performance data:', performance);
      console.log('[ControlTower] Portfolios array:', performance.portfolios);
    }
    if (perfError) {
      console.error('[ControlTower] Portfolio performance error:', perfError);
    }
  }, [performance, perfError]);

  const portfolios = performance?.portfolios || [];
  const topMover = portfolios.length > 0 ? [...portfolios].sort((a, b) => b.roi - a.roi)[0] : null;
  const bottomMover = portfolios.length > 0 ? [...portfolios].sort((a, b) => a.roi - b.roi)[0] : null;

  // Empty State: Mission Control Activation
  if (!isLoadingPerf && !perfError && portfolios.length === 0) {
    return (
      <div className="animate-fade-in pb-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Control Tower</h1>
        </header>
        <ControlTowerEmptyState 
          onImportClick={() => navigate({ to: '/inventory/ingestion' })}
          onInviteClick={() => navigate({ to: '/roster/staff' })}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header Context */}
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Control Tower</h1>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors",
          isConnected 
            ? "bg-success/10 border-success/20 text-success" 
            : "bg-warning/10 border-warning/20 text-warning"
        )}>
          {isConnected ? (
            <>
              <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider">Live Feed</span>
            </>
          ) : (
            <>
              <div className="h-1.5 w-1.5 rounded-full bg-warning" />
              <span className="text-[10px] font-black uppercase tracking-wider">Connecting...</span>
            </>
          )}
        </div>
      </header>

      {/* Tier 1: The Command Hero (Now a Card) */}
      <LiquidationCurve
        current={dashboard?.snapshot.totalCollections || 0}
        target={dashboard?.snapshot.dailyCollectionsTarget || 0}
        businessHours={dashboard?.businessHours}
        isLoading={isLoading}
      />

      {/* Tier 2: The Operational Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Event Pulse (70%) */}
        <div className="lg:col-span-8">
          <OperationalPulse 
            activities={dashboard?.recentActivity || []}
            isLoading={isLoading}
          />
        </div>

        {/* Right: Resource Health & Compliance (30%) */}
        <div className="lg:col-span-4 space-y-8">
          <AuditShield organizationId={organizationId!} />
          
          <ResourceFriction 
            collectors={dashboard?.teamStatus || []}
            totalContacts={dashboard?.snapshot.totalContacts || 0}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Tier 3: Asset Performance Movers */}
      <div className="bg-card rounded-xl border border-border shadow-md">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Layers size={16} className="text-primary" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Asset Performance Movers</h3>
        </div>

        {perfError ? (
          <div className="p-12 flex items-center justify-center">
            <div className="text-center space-y-2">
              <AlertTriangle size={32} className="mx-auto text-error/60" />
              <p className="text-xs font-bold text-error">
                Failed to load portfolio data
              </p>
              <p className="text-[10px] text-muted-foreground">
                The analytics service may be unavailable. Try refreshing the page.
              </p>
            </div>
          </div>
        ) : !topMover && !bottomMover ? (
          <div className="p-12 flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="inline-flex rounded-full bg-violet-500/10 p-4 mx-auto">
                <Package size={32} className="text-violet-600" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-violet-600">
                  {isLoadingPerf ? 'Loading portfolios...' : 'No portfolios yet'}
                </p>
                {!isLoadingPerf && (
                  <p className="text-[10px] text-muted-foreground">
                    Import your first portfolio to see performance metrics.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Top Mover */}
            {topMover && (
              <div className="p-6 bg-gradient-to-br from-success/5 to-transparent"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-success/10 border border-success/20">
                      <Target size={10} className="text-success" />
                      <p className="text-[9px] font-black text-success uppercase tracking-[0.15em] leading-none">Yield Alpha</p>
                    </div>
                    <h4 className="text-lg font-bold text-foreground">
                      {topMover.portfolioName}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-tighter">
                      ID: {topMover.portfolioId.substring(0, 8)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono text-success flex items-center justify-end gap-1">
                      <ArrowUpRight size={20} />
                      {topMover.roi.toFixed(1)}%
                    </div>
                    <p className="text-[10px] font-bold text-success/60 uppercase tracking-widest">Net ROI</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Mover */}
            {bottomMover && (
              <div className="p-6 bg-gradient-to-br from-amber-500/5 to-transparent"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle size={10} className="text-amber-500" />
                      <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.15em] leading-none">Drift Alert</p>
                    </div>
                    <h4 className="text-lg font-bold text-foreground">
                      {bottomMover.portfolioName}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono uppercase tracking-tighter">
                      ID: {bottomMover.portfolioId.substring(0, 8)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono text-amber-600 flex items-center justify-end gap-1">
                      <ArrowDownRight size={20} />
                      {bottomMover.roi.toFixed(1)}%
                    </div>
                    <p className="text-[10px] font-bold text-amber-600/60 uppercase tracking-widest">Underperforming</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
