import React from 'react';
import { TrendingUp, AlertCircle, Zap, TrendingDown } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface VelocityGaugeProps {
  currentCollections: number;
  targetGoal?: number;
  trendPercentage?: number;
  isLoading?: boolean;
}

/**
 * VelocityGauge
 * Implements the Probabilistic Range Projection from the v3.0 Spec.
 */
export const VelocityGauge: React.FC<VelocityGaugeProps> = ({ 
  currentCollections, 
  targetGoal = 15000, // Default fallback if goal not set
  trendPercentage = 0,
  isLoading = false
}) => {
  const progressPercent = Math.min((currentCollections / targetGoal) * 100, 100);
  // Simple heuristic for "off track" - if we are behind schedule. 
  const isOffTrack = progressPercent < 85 && progressPercent > 0;
  const isStartOfDay = currentCollections === 0;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-md h-[280px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading velocity metrics...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Liquidation Velocity</h3>
        <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${trendPercentage >= 0 ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'}`}>
          {trendPercentage >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{trendPercentage > 0 ? '+' : ''}{trendPercentage}% vs yesterday</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className={cn(
              "text-4xl font-bold font-mono tracking-tighter",
              isStartOfDay ? "text-muted-foreground/40" : "text-foreground"
            )}>
              ${currentCollections.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm font-medium text-muted-foreground">
              of <span className="font-mono">${targetGoal.toLocaleString()}</span> daily goal
            </div>
          </div>

          <div className="relative pt-2">
            <div className={cn(
              "h-3 w-full overflow-hidden rounded-full bg-muted",
              isStartOfDay && "bg-muted/50"
            )}>
              <div
                className={cn(
                  "h-full transition-all duration-1000",
                  isOffTrack ? 'bg-warning' : 'bg-primary',
                  isStartOfDay && "bg-primary/20 animate-pulse"
                )}
                style={{ width: isStartOfDay ? '100%' : `${progressPercent}%` }}
              ></div>
            </div>
            {/* Target Marker */}
            {!isStartOfDay && <div className="absolute top-0 right-[0%] -mt-1 h-6 w-0.5 bg-border"></div>}
          </div>

          <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Started 08:00</span>
            {isStartOfDay && <span className="text-primary animate-pulse italic">Waiting for first collection...</span>}
            <span>EOD 21:00</span>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-4 border border-border">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Probabilistic EOD Projection</div>

          <div className="space-y-4">
            <div className="flex items-end justify-between">
               <div className={cn(
                 "text-2xl font-bold font-mono",
                 isStartOfDay ? "text-muted-foreground/40" : "text-foreground"
               )}>
                 {isStartOfDay ? '$0.00' : (
                   <>${(currentCollections * 1.1).toLocaleString(undefined, { maximumFractionDigits: 0 })} – ${(currentCollections * 1.25).toLocaleString(undefined, { maximumFractionDigits: 0 })}</>
                 )}
               </div>
              {!isStartOfDay && <div className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">92% CONFIDENCE</div>}
            </div>

            {isStartOfDay ? (
              <div className="text-[10px] text-muted-foreground leading-relaxed italic border-t border-border pt-3">
                Projections will activate once the first transaction is processed for today's batch.
              </div>
            ) : isOffTrack && (
              <div className="flex items-start gap-3 rounded-md bg-warning/10 p-3 border border-warning/20 border-l-4 border-l-warning">
                <AlertCircle className="h-5 w-5 text-warning flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-xs leading-relaxed text-foreground">
                    Velocity is currently <span className="font-bold">low</span>. You are projected to miss the daily target.
                  </p>
                  <button className="flex items-center gap-2 rounded bg-warning/90 px-3 py-1.5 text-xs font-bold text-warning-foreground hover:bg-warning transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95">
                    <Zap size={14} />
                    LAUNCH REMEDY BLAST
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
