import React from 'react';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Clock, Target } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface LiquidationCurveProps {
  current: number;
  target: number;
  businessHours?: {
    start: number; // Hour 0-23
    end: number;   // Hour 0-23
  };
  isLoading?: boolean;
}

/**
 * LiquidationCurve (Full Width Hero)
 * Replaces the old Velocity Gauge.
 * Shows progress against an intraday timeline (configurable business hours).
 */
export const LiquidationCurve: React.FC<LiquidationCurveProps> = ({
  current,
  target,
  businessHours = { start: 8, end: 21 },
  isLoading
}) => {
  // If no target is configured, show empty state
  if (!target || target === 0) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-6 shadow-md">
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="rounded-full bg-amber-500/10 p-4">
            <Target size={48} className="text-amber-600" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-amber-600">
              No Collection Target Set
            </p>
            <p className="text-[10px] text-muted-foreground">
              Configure daily collection goals in Settings to track liquidation velocity.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const progress = Math.min((current / target) * 100, 100);

  // Calculate 'Expected Progress' based on time of day and business hours
  const now = new Date();
  const start = new Date(); start.setHours(businessHours.start, 0, 0, 0);
  const end = new Date(); end.setHours(businessHours.end, 0, 0, 0);

  let expectedPace = 0;
  if (now > start && now < end) {
    const totalMinutes = (end.getTime() - start.getTime()) / 60000;
    const elapsedMinutes = (now.getTime() - start.getTime()) / 60000;
    expectedPace = (elapsedMinutes / totalMinutes) * 100;
  } else if (now >= end) {
    expectedPace = 100;
  }

  const isBehind = progress < expectedPace - 5; 

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-md">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Liquidation Velocity</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-black font-mono tracking-tighter text-foreground">
              ${current.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h2>
            <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">/ ${target.toLocaleString()} Goal</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right space-y-0.5">
            <div className={cn(
              "flex items-center justify-end gap-1 text-xs font-black font-mono leading-none",
              isBehind ? "text-error" : "text-success"
            )}>
              {isBehind ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
              {isBehind ? 'BEHIND' : 'AHEAD'} {Math.abs(Math.round(progress - expectedPace))}%
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">vs Expected Pace</p>
          </div>

          <div className="h-8 w-px bg-border hidden md:block" />

          <div className="text-right space-y-0.5">
            <div className="text-xs font-black font-mono text-foreground leading-none">
              {Math.round(expectedPace)}%
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Expected by Now</p>
          </div>
        </div>
      </div>

      {/* High-Fidelity Timeline */}
      <div className="relative h-10 flex items-center px-1">
        {/* Track */}
        <div className="absolute inset-x-0 h-1.5 bg-muted rounded-full mx-1" />
        
        {/* Expected Pace Marker (Ghost line) */}
        <div 
          className="absolute h-1.5 bg-primary/10 rounded-full transition-all duration-1000 mx-1"
          style={{ width: `calc(${expectedPace}% - 8px)` }}
        />

        {/* Actual Progress */}
        <div 
          className={cn(
            "absolute h-2 rounded-full transition-all duration-1000 shadow-sm mx-1",
            isBehind ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `calc(${progress}% - 8px)` }}
        />

        {/* Current Indicator Node */}
        <div 
          className={cn(
            "absolute h-4 w-4 bg-card border-2 rounded-full shadow-md transition-all duration-1000 z-10",
            isBehind ? "border-amber-500" : "border-primary"
          )}
          style={{ left: `calc(${progress}% - 8px)` }}
        />

        {/* Dynamic Time Markers */}
        <div className="absolute inset-x-0 -bottom-6 flex justify-between px-1">
          {(() => {
            const { start, end } = businessHours;
            const totalHours = end - start;
            const markers = [start];
            // Add 3 intermediate markers evenly spaced
            for (let i = 1; i <= 3; i++) {
              markers.push(start + Math.round((totalHours / 4) * i));
            }
            markers.push(end);
            return markers.map(hour => {
              const formattedTime = `${hour.toString().padStart(2, '0')}:00`;
              return (
                <div key={hour} className="flex flex-col items-center gap-1">
                  <div className="h-1 w-px bg-border" />
                  <span className="text-[9px] font-bold font-mono text-muted-foreground/60 tracking-tighter">{formattedTime}</span>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
};
