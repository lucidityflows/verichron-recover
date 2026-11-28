import React from 'react';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface DailyProgressRingProps {
  collected: number;
  goal: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'hero';
}

/**
 * DailyProgressRing
 * SVG-based circular progress indicator
 *
 * Design Philosophy: "The Scoreboard" - Celebrate wins visually
 * - Green ring fills clockwise as collector progresses toward goal
 * - Percentage shown in center with large typography
 * - Trend indicator (up/down) based on yesterday's performance
 * - Celebration animation at 100%
 */
export const DailyProgressRing: React.FC<DailyProgressRingProps> = ({
  collected,
  goal,
  label = 'Daily Goal',
  size = 'lg',
  variant = 'default',
}) => {
  const percentage = Math.min((collected / goal) * 100, 100);
  const isComplete = percentage >= 100;
  const isOnTrack = percentage >= 75;
  const isHero = variant === 'hero';

  // SVG circle parameters
  const sizeConfig = {
    sm: { radius: 35, strokeWidth: 6, width: 80, height: 80 },
    md: { radius: 50, strokeWidth: 8, width: 120, height: 120 },
    lg: { radius: 70, strokeWidth: 10, width: 160, height: 160 },
  }[size];

  const { radius, strokeWidth, width, height } = sizeConfig;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const centerX = width / 2;
  const centerY = height / 2;
  
  // Color configuration based on variant
  const colors = isHero ? {
    bgStroke: 'rgba(255, 255, 255, 0.2)',
    progressStroke: isComplete ? '#34d399' : '#ffffff', // Emerald-400 or White
    textMain: isComplete ? 'text-emerald-300' : 'text-white',
    textSub: 'text-indigo-100',
    textLabel: 'text-indigo-100',
    textValue: 'text-white',
    badgeBg: 'bg-emerald-400',
  } : {
    bgStroke: 'rgb(226, 232, 240)', // slate-200
    progressStroke: isComplete ? 'rgb(16, 185, 129)' : isOnTrack ? 'rgb(99, 102, 241)' : 'rgb(245, 158, 11)',
    textMain: isComplete ? 'text-emerald-600' : isOnTrack ? 'text-indigo-600' : 'text-amber-600',
    textSub: 'text-slate-500',
    textLabel: 'text-slate-500',
    textValue: 'text-slate-900',
    badgeBg: 'bg-emerald-500',
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width, height }}>
        {/* SVG Progress Ring */}
        <svg width={width} height={height} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke={colors.bgStroke}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke={colors.progressStroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn(
              'transition-all duration-700 ease-out',
              isComplete && 'animate-pulse'
            )}
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={cn(
              'font-mono font-bold',
              size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-2xl' : 'text-xl',
              colors.textMain
            )}
          >
            {percentage.toFixed(0)}%
          </div>
          <div className={cn('text-xs font-medium mt-1', colors.textSub)}>
            {isComplete ? 'Goal Met!' : 'of goal'}
          </div>
        </div>

        {/* Status Icon (top-right badge) */}
        {isComplete && (
          <div className={cn(
            "absolute -top-2 -right-2 h-10 w-10 rounded-full flex items-center justify-center shadow-lg animate-bounce",
            colors.badgeBg
          )}>
            <Target size={20} className="text-white" />
          </div>
        )}
      </div>

      {/* Label & Amounts */}
      <div className="text-center space-y-1">
        <div className={cn('text-xs font-bold uppercase tracking-widest', colors.textLabel)}>{label}</div>
        <div className="flex items-baseline gap-2 justify-center">
          <span className={cn('text-2xl font-mono font-bold', colors.textValue)}>
            ${collected.toLocaleString()}
          </span>
          <span className={cn('text-sm', colors.textSub)}>/ ${goal.toLocaleString()}</span>
        </div>
        <div
          className={cn(
            'text-xs font-medium flex items-center gap-1 justify-center',
            isHero ? (isOnTrack ? 'text-emerald-300' : 'text-amber-300') : (isOnTrack ? 'text-emerald-600' : 'text-amber-600')
          )}
        >
          {isOnTrack ? (
            <>
              <TrendingUp size={12} />
              On track
            </>
          ) : (
            <>
              <TrendingDown size={12} />
              {goal - collected > 0 ? `$${(goal - collected).toLocaleString()} to go` : 'Behind'}
            </>
          )}
        </div>
      </div>

      {/* Celebration Message */}
      {isComplete && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg px-4 py-2 text-center shadow-lg">
          <div className="text-sm font-bold">🎉 Outstanding Work!</div>
          <div className="text-xs opacity-90">You've crushed today's goal</div>
        </div>
      )}
    </div>
  );
};
