import React from 'react';
import { cn } from '@/shared/utils/cn';

interface UtilizationGaugeProps {
  current: number;
  projected?: number;
  label: string;
}

/**
 * UtilizationGauge
 * Implements the Amber/Red/Pulse status logic from the v3.0 Spec.
 * Amber at 90%, Pulse Red at 100%+.
 */
export const UtilizationGauge: React.FC<UtilizationGaugeProps> = ({ current, projected, label }) => {
  const value = projected !== undefined ? projected : current;
  const isOverloaded = value >= 100;
  const isWarning = value >= 90 && value < 100;
  const isLow = value < 70;

  // Determine current bar color
  const getCurrentBarColor = () => {
    if (isOverloaded) return "bg-error";
    if (isWarning) return "bg-warning";
    if (isLow) return "bg-primary";
    return "bg-success";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className={cn(
          "text-xs font-mono font-bold",
          isOverloaded ? "text-error animate-pulse" : isWarning ? "text-warning" : isLow ? "text-primary" : "text-success"
        )}>
          {current}% {projected !== undefined && <span className="text-[10px] opacity-70">→ {projected}%</span>}
        </span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/30">
        {/* Current Fill */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-all duration-500",
            getCurrentBarColor()
          )}
          style={{ width: `${Math.min(current, 100)}%` }}
        />

        {/* Projected Fill (Ghost Overlay) */}
        {projected !== undefined && (
          <div
            className={cn(
              "absolute inset-y-0 left-0 transition-all duration-300 opacity-50",
              isOverloaded ? "bg-error" : "bg-primary"
            )}
            style={{ width: `${Math.min(projected, 100)}%` }}
          />
        )}

        {/* Danger Pulse for Overload */}
        {isOverloaded && (
          <div className="absolute inset-0 animate-pulse bg-error/20" />
        )}
      </div>
    </div>
  );
};
