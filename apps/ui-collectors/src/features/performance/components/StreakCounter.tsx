import React from 'react';
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Zap, Trophy, Star, Flame } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface StreakCounterProps {
  currentStreak: number;
  streakType: 'PTPS' | 'PAYMENTS' | 'CONTACTS' | 'DAYS_WORKED';
  label: string;
  bestStreak?: number;
  showBest?: boolean;
  className?: string;
}

/**
 * StreakCounter
 * Gamified achievement counter for consecutive successes
 *
 * Design Philosophy: "Micro-Wins Feedback" - Celebrate momentum
 * - Fire emoji for active streaks
 * - Trophy for personal records
 * - Animated flame effect
 * - Color-coded tiers (Bronze/Silver/Gold/Platinum)
 */
export const StreakCounter: React.FC<StreakCounterProps> = ({
  currentStreak,
  label,
  bestStreak,
  showBest = true,
  className,
}) => {
  const isNewRecord = bestStreak && currentStreak >= bestStreak;

  // Tier system for streaks
  const getTier = (streak: number) => {
    if (streak >= 20) return { name: 'Platinum', color: 'from-purple-500 to-pink-500', icon: Trophy };
    if (streak >= 10) return { name: 'Gold', color: 'from-amber-400 to-yellow-500', icon: Star };
    if (streak >= 5) return { name: 'Silver', color: 'from-slate-300 to-slate-400', icon: Zap };
    return { name: 'Bronze', color: 'from-orange-400 to-red-500', icon: Flame };
  };

  const tier = getTier(currentStreak);
  const TierIcon = tier.icon;

  return (
    <div
      className={cn(
        'bg-gradient-to-br rounded-xl p-6 text-white shadow-lg relative overflow-hidden',
        tier.color,
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-6 -top-6 opacity-20">
        <TierIcon size={120} className="text-white" />
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
              <Flame size={20} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest opacity-90">
                {tier.name} Streak
              </div>
              <div className="text-xs opacity-75">{label}</div>
            </div>
          </div>

          {/* New Record Badge */}
          {isNewRecord && (
            <div className="flex items-center gap-1 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold animate-bounce">
              <Trophy size={12} />
              New Record!
            </div>
          )}
        </div>

        {/* Streak Count */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-mono font-bold">{currentStreak}</span>
            <span className="text-xl opacity-75">in a row</span>
          </div>
        </div>

        {/* Best Streak Comparison */}
        {showBest && bestStreak && (
          <div className="flex items-center justify-between text-xs opacity-75 pt-2 border-t border-white/20">
            <span>Personal Best</span>
            <span className="font-mono font-bold">{bestStreak}</span>
          </div>
        )}

        {/* Motivational Message */}
        <div className="bg-white/20 rounded-lg px-3 py-2 text-xs font-medium text-center">
          {currentStreak === 0 && 'Start your streak today! 💪'}
          {currentStreak >= 1 && currentStreak < 3 && 'Keep it going! 🔥'}
          {currentStreak >= 3 && currentStreak < 5 && 'On fire! Don\'t stop now! 🚀'}
          {currentStreak >= 5 && currentStreak < 10 && 'Incredible momentum! ⚡'}
          {currentStreak >= 10 && currentStreak < 20 && 'You\'re unstoppable! 🏆'}
          {currentStreak >= 20 && 'LEGEND STATUS! 👑'}
        </div>
      </div>

      {/* Flame particles animation */}
      {currentStreak > 0 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute bottom-0 w-1 h-1 bg-white rounded-full animate-float-up"
              style={{
                left: `${20 + i * 15}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${2 + i * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(0);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: float-up 3s ease-in infinite;
        }
      `}</style>
    </div>
  );
};
