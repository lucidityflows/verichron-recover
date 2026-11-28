import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  TrendingUp,
  ChevronRight,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Filter,
  Download,
  Pencil,
  Loader2
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useUser } from '../../shared/store/userStore.js';
import { usePortfolioPerformance } from './hooks/usePortfolioPerformance.js';
import { EditPortfolioModal } from './components/EditPortfolioModal.js';
import { usePortfoliosControllerFindOne } from '@/api/generated/debts/endpoints/portfolios/portfolios';

/**
 * PortfolioROIDashboard
 * Strategic view of debt tranches focusing on Net Recovery and IRR.
 */
export const PortfolioROIDashboard: React.FC = () => {
  const { organizationId } = useUser();
  const navigate = useNavigate();
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null);

  const { data: performance, isLoading } = usePortfolioPerformance(organizationId, {
    pageSize: 20
  });

  // Fetch full portfolio details for editing
  const { data: fullPortfolioData, isLoading: isLoadingFull } = usePortfoliosControllerFindOne(
    organizationId!, 
    selectedPortfolioId!, 
    { query: { enabled: !!selectedPortfolioId } }
  );

  if (isLoading && !performance) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-medium">Loading strategic inventory...</div>
      </div>
    );
  }

  const portfolios = performance?.portfolios || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Inventory</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Portfolio ROI</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Strategic Inventory</h1>
          <p className="text-sm font-medium text-muted-foreground">Net profitability and recovery performance across all tranches.</p>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Filter size={16} />
            Filter Tranches
          </button>
          <button className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Download size={16} />
            Export Data
          </button>
        </div>
      </header>

      {/* Aggregate ROI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { 
            label: 'Total Net Recovery', 
            value: `$${(Number(performance?.totalPaymentsCollected || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 
            trend: '+8.2%', 
            trendUp: true 
          },
          { 
            label: 'Overall Recovery Rate', 
            value: `${performance?.overallRecoveryRate.toFixed(1) || 0}%`, 
            trend: '+1.2%', 
            trendUp: true 
          },
          { 
            label: 'Total Cost-to-Date', 
            value: `$${(Number(performance?.totalInvested || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 
            trend: '-2.4%', 
            trendUp: false 
          },
          { 
            label: 'Total Face Value', 
            value: `$${portfolios.reduce((acc, p) => acc + Number(p.totalPrincipal), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 
            trend: 'Stable', 
            trendUp: null 
          },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 shadow-md">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
            <div className="mt-2 flex items-end justify-between">
              <span className="text-2xl font-bold font-mono text-foreground">{stat.value}</span>
              {stat.trendUp !== null && (
                <span className={cn(
                  "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                  stat.trendUp ? "bg-success/10 text-success" : "bg-error/10 text-error"
                )}>
                  {stat.trendUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {stat.trend}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* tranches Table */}
      <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
        <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-tight">
            <PieChart size={14} />
            Portfolio Performance Matrix
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Portfolio Detail</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Face Value</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Collected</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">ROI %</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Multiplier</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Health</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {portfolios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-muted-foreground text-xs italic">No performance data found.</td>
                </tr>
              ) : (
                portfolios.map((p) => {
                  const multiplier = Number(p.purchasePrice) > 0 ? (Number(p.totalCollected) / Number(p.purchasePrice)).toFixed(2) : '0.00';
                  const health = p.roi > 20 ? 'PROFITABLE' : p.roi > 10 ? 'ON_TRACK' : 'UNDERPERFORMING';
                  
                  return (
                    <tr
                      key={p.portfolioId}
                      className="hover:bg-muted transition-colors group cursor-pointer"
                      onClick={() => navigate({ to: `/inventory/portfolios/${p.portfolioId}` })}
                    >
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <div className="text-sm font-bold text-foreground font-sans group-hover:text-primary transition-colors">{p.portfolioName}</div>
                          <div className="text-[10px] text-muted-foreground">ID: {p.portfolioId.substring(0, 8).toUpperCase()} • ${Number(p.purchasePrice).toLocaleString()} Basis</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-muted-foreground">${Number(p.totalPrincipal).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-foreground">${Number(p.totalCollected).toLocaleString()}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "text-xs font-bold",
                          health === 'PROFITABLE' ? "text-success" :
                          health === 'ON_TRACK' ? "text-warning" : "text-error"
                        )}>{p.roi.toFixed(1)}%</span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-muted-foreground">
                        {multiplier}x
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={cn(
                          "inline-block h-2 w-2 rounded-full",
                          health === 'PROFITABLE' ? "bg-success shadow-[0_0_8px_rgb(var(--success-rgb)/0.4)]" :
                          health === 'ON_TRACK' ? "bg-warning" : "bg-error"
                        )} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPortfolioId(p.portfolioId);
                          }}
                          disabled={isLoadingFull && selectedPortfolioId === p.portfolioId}
                          className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                        >
                          {isLoadingFull && selectedPortfolioId === p.portfolioId ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {fullPortfolioData && (
        <EditPortfolioModal
          isOpen={!!selectedPortfolioId}
          onClose={() => setSelectedPortfolioId(null)}
          portfolio={fullPortfolioData.data}
        />
      )}
    </div>
  );
};
