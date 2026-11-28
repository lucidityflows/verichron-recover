import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface CommissionTickerProps {
  totalCollected: number;
  commissionRate?: number; // Default 3% (0.03)
  previousAmount?: number; // For showing delta
  animate?: boolean;
  className?: string;
}

/**
 * CommissionTicker
 * Live earnings estimate with smooth number animation
 *
 * Design Philosophy: "Micro-Wins Feedback" - Gamify the work
 * - Shows estimated commission based on collected amount
 * - Animates numbers upward when new collections logged
 * - Green pulsing effect on updates
 * - Delta badge showing increase from previous amount
 */
export const CommissionTicker: React.FC<CommissionTickerProps> = ({
  totalCollected,
  commissionRate = 0.03,
  previousAmount = 0,
  animate = true,
  className,
}) => {
  const [displayAmount, setDisplayAmount] = useState(totalCollected * commissionRate);
  const commission = totalCollected * commissionRate;
  const delta = commission - previousAmount * commissionRate;
  const hasIncrease = delta > 0;

  // Smooth number animation
  useEffect(() => {
    if (!animate) {
      setDisplayAmount(commission);
      return;
    }

    const duration = 1000; // 1 second animation
    const steps = 60;
    const increment = (commission - displayAmount) / steps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setDisplayAmount((prev) => {
        const next = prev + increment;
        if (currentStep >= steps) {
          clearInterval(timer);
          return commission;
        }
        return next;
      });
    }, duration / steps);

    return () => clearInterval(timer);
  }, [commission, animate]);

  return (
    <div className={cn("bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden", className)}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 opacity-10">
        <Sparkles size={120} className="text-white" />
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
              <DollarSign size={20} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest opacity-90">
                Your Earnings
              </div>
              <div className="text-xs opacity-75">
                {(commissionRate * 100).toFixed(1)}% of collected
              </div>
            </div>
          </div>

          {/* Delta Badge */}
          {hasIncrease && (
            <div className="flex items-center gap-1 bg-emerald-500 px-2 py-1 rounded-full text-xs font-bold animate-bounce">
              <TrendingUp size={12} />
              +${delta.toFixed(2)}
            </div>
          )}
        </div>

        {/* Commission Amount */}
        <div className="space-y-1">
          <div
            className={cn(
              'text-5xl font-mono font-bold transition-all duration-300',
              hasIncrease && 'animate-pulse'
            )}
          >
            ${displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs opacity-75">
            Collected: ${totalCollected.toLocaleString()}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs opacity-75">
            <span>Today's Progress</span>
            <span>{((totalCollected / 10000) * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.min((totalCollected / 10000) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Shine effect on update */}
      {hasIncrease && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};