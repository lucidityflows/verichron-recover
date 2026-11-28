import React, { useState, useEffect, useCallback } from 'react';
import { SkipForward } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface CountdownTimerProps {
  /** Total seconds for countdown */
  seconds: number;
  /** Called when countdown reaches zero */
  onComplete: () => void;
  /** Called when user manually triggers early */
  onConnectNow: () => void;
  /** Called when user wants to skip */
  onSkip?: () => void;
  /** Number of skips remaining */
  skipsRemaining?: number;
  /** Whether the timer is paused */
  isPaused?: boolean;
}

/**
 * CountdownTimer
 * Visual countdown with progress ring for Flow State mode
 *
 * Design Philosophy: Calm urgency - shows time without anxiety
 * Features pulse animation in final 10 seconds
 * Dark mode optimized
 */
export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  seconds,
  onComplete,
  onConnectNow,
  onSkip,
  skipsRemaining = 0,
  isPaused = false,
}) => {
  const [remaining, setRemaining] = useState(seconds);
  const [isComplete, setIsComplete] = useState(false);

  // Format time as M:SS
  const formatTime = useCallback((secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress percentage (inverted - starts full, empties)
  const progress = (remaining / seconds) * 100;

  // SVG circle parameters
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress / 100);

  useEffect(() => {
    if (isPaused || isComplete) return;

    if (remaining <= 0) {
      setIsComplete(true);
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, isPaused, isComplete, onComplete]);

  // Reset when seconds prop changes (new account)
  useEffect(() => {
    setRemaining(seconds);
    setIsComplete(false);
  }, [seconds]);

  const isUrgent = remaining <= 10;
  const isVeryUrgent = remaining <= 5;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Circular Progress */}
      <div className="relative">
        <svg
          width="240"
          height="240"
          viewBox="0 0 240 240"
          className={cn(
            'transform -rotate-90 transition-all',
            isUrgent && 'scale-105'
          )}
        >
          {/* Background circle */}
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="120"
            cy="120"
            r={radius}
            fill="none"
            stroke={isVeryUrgent ? '#ef4444' : isUrgent ? '#f59e0b' : '#0ea5e9'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'text-5xl font-bold font-mono tabular-nums transition-colors',
              isVeryUrgent ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-white',
              isUrgent && 'animate-pulse'
            )}
          >
            {formatTime(remaining)}
          </span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">
            {isComplete ? 'Connecting...' : 'Until Auto-Connect'}
          </span>
        </div>
      </div>

      {/* Progress bar (alternative visual) */}
      <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-1000 ease-linear',
            isVeryUrgent ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-sky-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Action Buttons */}
      {!isComplete && (
        <div className="flex items-center gap-3">
          {/* Skip Button */}
          {onSkip && (
            <button
              onClick={onSkip}
              disabled={skipsRemaining <= 0}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-300 bg-slate-800/50 border border-slate-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipForward size={16} />
              Skip
              {skipsRemaining > 0 && (
                <span className="text-xs text-slate-600">({skipsRemaining})</span>
              )}
            </button>
          )}

          {/* Connect Now Button */}
          <button
            onClick={onConnectNow}
            className={cn(
              'px-6 py-3 font-bold rounded-xl transition-all',
              isUrgent
                ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-500/20'
                : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            )}
          >
            Connect Now
          </button>
        </div>
      )}
    </div>
  );
};
