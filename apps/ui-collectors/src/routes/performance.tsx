/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unsafe-call */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2, ArrowLeft, RefreshCw, Mail, TrendingUp } from 'lucide-react';
import { useCollectorStats } from '@/features/performance/hooks/useCollectorStats';
import { DailyProgressRing } from '@/features/performance/components/DailyProgressRing';
import { MetricCard } from '@/features/performance/components/MetricCard';
import { CommissionTicker } from '@/features/performance/components/CommissionTicker';
import { StreakCounter } from '@/features/performance/components/StreakCounter';
import { useHotkey } from '@/shared/contexts/HotkeysContext';

export const Route = createFileRoute('/performance')({
  component: PerformancePage,
});

/**
 * PerformancePage
 * "The Scoreboard" - Real-time performance dashboard
 *
 * Design Philosophy: "Quiet Elegance & Gamification"
 * - Bento Grid layout (4 columns)
 * - Cohesive card styles (Gradients & Glass)
 * - No scrolling required (Dense info)
 */
function PerformancePage() {
  const { today, goals, isLoading, isError, error } = useCollectorStats();
  const navigate = useNavigate();

  // Keyboard shortcuts
  useHotkey('ESCAPE', () => {
    navigate({ to: '/' });
  });

  useHotkey('Q', () => {
    navigate({ to: '/' });
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-sky-500" />
          <p className="text-sm font-medium text-slate-400">Loading your performance stats...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <TrendingUp size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Failed to Load Stats</h2>
          <p className="text-sm text-slate-400">{(error as Error)?.message || 'Unknown error'}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate({ to: '/' })}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-sm font-medium text-slate-300"
            >
              Back to Break Room
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Extract data with defaults
  const collected = today?.data?.collectedToday || 0; // in cents
  const callsMade = today?.data?.callsMade || 0;
  const emailsSent = today?.data?.emailsSent || 0;
  const accountsContacted = today?.data?.accountsContacted || 0;

  // Default goals
  const dailyGoal = 500000; // $5000 in cents
  const callsGoal = 50;
  const ptpsGoal = 5;
  const contactsGoal = 30;

  // Placeholder values
  const ptps = 0;
  const currentStreak = 0;
  const bestStreak = 5;

  return (
    <div className="min-h-screen bg-slate-950 pb-8">
      {/* Header Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 sticky top-0 z-20 mb-6">
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Break Room
            </button>
            <div className="h-6 w-px bg-slate-700" />
            <h1 className="text-lg font-bold text-white">Performance Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw size={12} className="animate-spin-slow" />
              <span>Auto-refresh every 60s</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400">Esc</kbd>
              <span>to go back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* --- TOP ROW: HERO STATS --- */}
          
          {/* 1. Daily Progress Ring (1x1) - Cyan/Blue Gradient */}
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg p-4 flex items-center justify-center relative overflow-hidden">
             {/* Background decoration */}
            <div className="absolute top-0 right-0 opacity-10">
              <TrendingUp size={100} className="text-white" />
            </div>
            <div className="relative z-10">
              <DailyProgressRing collected={collected} goal={dailyGoal} label="Today's Goal" size="md" variant="hero" />
            </div>
          </div>

          {/* 2. Commission Ticker (2x1) */}
          <CommissionTicker 
            totalCollected={collected} 
            commissionRate={0.03} 
            previousAmount={collected * 0.9} 
            className="lg:col-span-2 h-full"
          />

          {/* 3. Streak Counter (1x1) */}
          <StreakCounter
            currentStreak={currentStreak}
            streakType="PTPS"
            label="Consecutive PTPs"
            bestStreak={bestStreak}
            showBest={true}
            className="h-full"
          />


          {/* --- ROW 2+: METRIC CARDS --- */}
          
          {/* Calls Made (Goal) - Indigo */}
          <MetricCard
            type="CALLS"
            label="Calls Made"
            value={callsMade}
            target={callsGoal}
            unit="calls"
            variant="indigo"
          />

          {/* PTPs (Goal) - Emerald */}
          <MetricCard
            type="PTPS"
            label="Promises to Pay"
            value={ptps}
            target={ptpsGoal}
            unit="PTPs"
            variant="emerald"
          />

          {/* Accounts Contacted (Goal) - Blue */}
          <MetricCard
            type="CONTACTS"
            label="Accounts Contacted"
            value={accountsContacted}
            target={contactsGoal}
            unit="accts"
            variant="blue"
          />

          {/* Emails Sent (Stat) - Purple */}
          <MetricCard
            type="CUSTOM"
            label="Emails Sent"
            value={emailsSent}
            unit="emails"
            icon={Mail}
            variant="purple"
          />

          {/* Additional Dynamic Goals from Backend */}
          {goals.map((goal: any, index: number) => {
            // Cycle through variants for visual variety
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const variants: any[] = ['amber', 'rose', 'indigo', 'emerald'];
            const variant = variants[index % variants.length];
            
            return (
              <MetricCard
                key={goal.id}
                type="CUSTOM"
                label={goal.name}
                value={goal.currentValue || 0}
                target={goal.targetValue || goal.target || 0}
                unit={goal.unit}
                variant={variant}
              />
            );
          })}

        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
}