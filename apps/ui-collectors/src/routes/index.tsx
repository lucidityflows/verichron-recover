import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Target, Zap, Brain, ArrowRight, Users } from 'lucide-react';
import { useHotkey } from '@/shared/contexts/HotkeysContext';
import { useUser } from '@/shared/store/userStore';
import { useWorkQueue } from '@/features/queue/hooks/useWorkQueue';
import { useCollectorStats } from '@/features/performance/hooks/useCollectorStats';
import { useCollectorPreferences } from '@/shared/store/collectorPreferencesStore';

export const Route = createFileRoute('/')({
  component: BreakRoomPage,
});

/**
 * Break Room Page
 * The collector's home base - a calm space to choose how they want to work
 *
 * Design Philosophy: "The Break Room" - Calm, intentional, empowering
 * Two work modes: Flow State (system-led) or Strategy Mode (collector-led)
 * Dark mode for reduced eye strain during long sessions
 */
function BreakRoomPage() {
  const navigate = useNavigate();
  const { user, hasRole } = useUser();
  const { items, summary } = useWorkQueue({ limit: 3 });
  const { today, goals, isLoading: statsLoading } = useCollectorStats();
  const { startSession, lastUsedMode } = useCollectorPreferences();

  // Keyboard shortcuts
  useHotkey('S', () => handleEnterStrategyMode());
  useHotkey('F', () => handleEnterFlowState());
  useHotkey('P', () => navigate({ to: '/performance' }));

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name?.split(' ')[0] ?? 'Collector';
  const queueCount = summary?.totalItems ?? items.length;
  const isTeamLead = hasRole(['TEAM_LEAD', 'MANAGER', 'ADMIN']);

  // Calculate today's stats from API response
  const todayStats = today?.data;
  const accountsWorked = todayStats?.accountsContacted ?? 0;
  const amountCollected = todayStats?.collectedToday ?? 0;

  // Calculate goal progress from active goals (average of all goal progress)
  const goalProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + (g.progressPercentage ?? 0), 0) / goals.length)
    : 0;

  const handleEnterFlowState = () => {
    startSession('FLOW_STATE');
    navigate({ to: '/flow-state' });
  };

  const handleEnterStrategyMode = () => {
    startSession('STRATEGY_MODE');
    navigate({ to: '/strategy' });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header - Greeting */}
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-slate-400">
            {queueCount} accounts waiting · How would you like to work?
          </p>
        </header>

        {/* Today's Snapshot - Compact Stats Bar */}
        <div className="flex justify-center">
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-slate-800 px-6 py-3 inline-flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Worked:</span>
              <span className="font-bold text-white font-mono">
                {statsLoading ? '—' : accountsWorked}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Collected:</span>
              <span className="font-bold text-emerald-400 font-mono">
                ${statsLoading ? '—' : (amountCollected / 100).toLocaleString()}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Goal:</span>
              <span className="font-bold text-indigo-400 font-mono">
                {statsLoading ? '—' : `${Math.round(goalProgress)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Work Mode Selection - Primary Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Flow State Mode */}
          <button
            onClick={handleEnterFlowState}
            className="group relative overflow-hidden rounded-xl bg-slate-900 p-6 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900/80 transition-all duration-200 text-left"
          >
            {lastUsedMode === 'FLOW_STATE' && (
              <div className="absolute top-3 right-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2 py-1 rounded">
                  Last Used
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-sky-500/10 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
                  <Zap size={24} className="text-sky-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Flow State</h3>
                  <p className="text-xs text-slate-400">System-led · Auto-connect</p>
                </div>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed">
                Stay in the zone. System queues accounts and auto-connects after 45-second preview.
              </p>

              <div className="flex items-center justify-between pt-2">
                <kbd className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-400 border border-slate-700">
                  F
                </kbd>
                <div className="flex items-center gap-2 text-sm font-medium text-sky-400 group-hover:gap-3 transition-all">
                  Enter Flow
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </button>

          {/* Strategy Mode */}
          <button
            onClick={handleEnterStrategyMode}
            className="group relative overflow-hidden rounded-xl bg-slate-900 p-6 border border-slate-800 hover:border-violet-500/50 hover:bg-slate-900/80 transition-all duration-200 text-left"
          >
            {lastUsedMode === 'STRATEGY_MODE' && (
              <div className="absolute top-3 right-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-2 py-1 rounded">
                  Last Used
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                  <Brain size={24} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Strategy Mode</h3>
                  <p className="text-xs text-slate-400">Collector-led · Manual dial</p>
                </div>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed">
                Plan your approach. Review top 3 priorities, make notes, call when ready.
              </p>

              <div className="flex items-center justify-between pt-2">
                <kbd className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-400 border border-slate-700">
                  S
                </kbd>
                <div className="flex items-center gap-2 text-sm font-medium text-violet-400 group-hover:gap-3 transition-all">
                  Enter Strategy
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Secondary Actions - Same visual weight */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Performance */}
          <Link
            to="/performance"
            className="group flex items-center gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/80 transition-all"
          >
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <Target size={20} className="text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white">Performance</div>
              <div className="text-xs text-slate-500">View detailed stats & goals</div>
            </div>
            <kbd className="px-2 py-1 bg-slate-800 rounded text-[10px] font-bold text-slate-400 border border-slate-700">
              P
            </kbd>
          </Link>

          {/* Floor View - Team Lead Only */}
          {isTeamLead ? (
            <Link
              to="/floor"
              className="group flex items-center gap-4 p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/80 transition-all"
            >
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                <Users size={20} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-white">
                  Floor View
                  <span className="ml-2 text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">
                    Lead
                  </span>
                </div>
                <div className="text-xs text-slate-500">Monitor your team</div>
              </div>
            </Link>
          ) : (
            // Placeholder to maintain grid balance when not a team lead
            <div className="hidden md:block" />
          )}
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="text-center">
          <p className="text-xs text-slate-600">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-[10px] text-slate-400">?</kbd>
            {' '}for keyboard shortcuts
          </p>
        </div>
      </div>
    </div>
  );
}
