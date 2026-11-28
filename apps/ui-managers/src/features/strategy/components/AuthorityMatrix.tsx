import React from 'react';
import { Percent, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface AuthorityMatrixProps {
  matrix?: any[]; // Using any for now since generated type is record
  isLoading?: boolean;
  onUpdate?: (minBalance: number, minAge: number, newValue: number) => void;
  isEditing?: boolean;
}

/**
 * AuthorityMatrix
 * High-density heatmap grid for defining max settlement discounts.
 * Axis Y: Balance Ranges | Axis X: Days Since Placement
 */
export const AuthorityMatrix: React.FC<AuthorityMatrixProps> = ({ matrix = [], isLoading = false, onUpdate, isEditing = false }) => {
  const ageBuckets = [
    { label: '0-30d', min: 0, max: 30 },
    { label: '31-60d', min: 31, max: 60 },
    { label: '61-90d', min: 61, max: 90 },
    { label: '90d+', min: 91, max: undefined },
  ];
  
  const balanceRanges = [
    { label: '$0 - $500', min: 0, max: 500 },
    { label: '$501 - $2,000', min: 501, max: 2000 },
    { label: '$2,001 - $5,000', min: 2001, max: 5000 },
    { label: '$5,001+', min: 5001, max: undefined },
  ];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-md h-[400px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <div className="text-sm font-medium text-muted-foreground">Loading strategy matrix...</div>
        </div>
      </div>
    );
  }

  // Helper to find discount for a specific cell
  const getRule = (minBalance: number, minAge: number) => {
    return matrix.find((r: any) => 
      Number(r.minBalance) === minBalance && 
      Number(r.minAgeDays) === minAge
    );
  };

  const getBackgroundColor = (percent: number) => {
    if (percent > 40) return 'bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20';
    if (percent > 20) return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20';
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20';
  };

  const getProjectedRecovery = (minBalance: number, maxBalance: number | undefined, percent: number) => {
    const avgBalance = maxBalance ? (minBalance + maxBalance) / 2 : minBalance * 1.5;
    const recovery = avgBalance * (1 - percent / 100);
    return `Est. Recovery: ~$${Math.round(recovery).toLocaleString()} (avg)`;
  };

  const handleInputChange = (minBalance: number, minAge: number, value: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100 && onUpdate) {
      onUpdate(minBalance, minAge, numValue);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Percent size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Settlement Authority Heatmap</h3>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <Info size={12} />
          Max Collector Discount %
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-muted/60 border-b border-r border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-48">
                Balance Range
              </th>
              {ageBuckets.map((bucket) => (
                <th key={bucket.label} className="px-4 py-3 bg-muted/60 border-b border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">
                  {bucket.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {balanceRanges.map((range) => (
              <tr key={range.label} className="group">
                <td className="px-6 py-4 border-r border-border bg-muted/20 text-xs font-bold text-foreground group-hover:bg-muted/40 transition-colors">
                  {range.label}
                </td>
                {ageBuckets.map((bucket, idx) => {
                  const rule = getRule(range.min, bucket.min);
                  const percent = rule ? Math.round((rule).maxDiscountPercent) : 0;
                  const colorClass = getBackgroundColor(percent);

                  return (
                    <td key={idx} className="p-1 text-center h-16 w-32 relative">
                      <div 
                        className={cn(
                          "w-full h-full rounded-lg flex items-center justify-center transition-all relative group/cell border-2",
                          isEditing ? "cursor-text border-transparent hover:border-primary/20" : "cursor-default border-transparent",
                          colorClass
                        )}
                        title={getProjectedRecovery(range.min, range.max, percent)}
                      >
                        <div className="flex items-baseline gap-0.5">
                          {isEditing ? (
                            <input
                              type="text"
                              value={percent}
                              onChange={(e) => handleInputChange(range.min, bucket.min, e.target.value)}
                              className="w-10 bg-transparent border-none p-0 text-center text-sm font-bold focus:ring-0 cursor-text font-mono"
                            />
                          ) : (
                            <span className="text-sm font-bold font-mono inline-block w-10 text-center">{percent}</span>
                          )}
                          <span className="text-[10px] opacity-60">%</span>
                        </div>
                        
                        {/* Hover Edit Hint */}
                        {isEditing && (
                          <div className="absolute -top-2 -right-2 hidden group-hover/cell:flex h-4 w-4 rounded-full bg-primary text-primary-foreground items-center justify-center text-[8px] shadow-sm animate-in zoom-in duration-200 z-10">
                            ✎
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-muted/20 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-emerald-500/20 border border-emerald-500/30" />
            <span className="text-muted-foreground font-medium">Conservative (0-20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-yellow-500/20 border border-yellow-500/30" />
            <span className="text-muted-foreground font-medium">Balanced (21-40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-red-500/20 border border-red-500/30" />
            <span className="text-muted-foreground font-medium">Aggressive (41%+)</span>
          </div>
        </div>
        {isEditing && (
          <p className="text-muted-foreground text-[10px] flex items-center gap-1">
            <AlertTriangle size={10} />
            Changes pending review
          </p>
        )}
      </div>
    </div>
  );
};
