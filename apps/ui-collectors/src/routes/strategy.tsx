import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Brain, RefreshCw } from 'lucide-react';
import { useHotkey } from '@/shared/contexts/HotkeysContext';
import { useWorkQueue } from '@/features/queue/hooks/useWorkQueue';
import { useCollectorPreferences } from '@/shared/store/collectorPreferencesStore';
import { PriorityCard } from '@/features/strategy-mode/components/PriorityCard';

export const Route = createFileRoute('/strategy')({
  component: StrategyModePage,
});

/**
 * Strategy Mode Page
 * Collector-led work mode with top 3 priorities
 *
 * Design Philosophy: "Let me plan my approach"
 * Shows top 3 priority cards only - Strategy Mode is about focus, not browsing
 */
function StrategyModePage() {
  const navigate = useNavigate();
  const { items, summary, isLoading, refetch } = useWorkQueue();
  const { endSession, accountsWorkedThisSession } = useCollectorPreferences();

  // Keyboard shortcuts
  useHotkey('ESCAPE', () => handleReturnToBreakRoom());
  useHotkey('R', () => refetch());
  useHotkey('1', () => items[0] && handleReviewAccount(items[0].debtorId));
  useHotkey('2', () => items[1] && handleReviewAccount(items[1].debtorId));
  useHotkey('3', () => items[2] && handleReviewAccount(items[2].debtorId));

  const handleReturnToBreakRoom = () => {
    endSession();
    navigate({ to: '/' });
  };

  const handleReviewAccount = (debtorId: string) => {
    navigate({ to: '/workbench/$debtorId', params: { debtorId } });
  };

  // Top 3 priorities only - Strategy Mode is about focus, not browsing
  const topPriorities = items.slice(0, 3);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-slate-700 border-t-violet-500" />
          <p className="text-sm font-medium text-slate-400">Loading your priorities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleReturnToBreakRoom}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                title="Return to Break Room (Esc)"
              >
                <ArrowLeft size={20} className="text-slate-400" />
              </button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                  <Brain size={20} className="text-violet-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Strategy Mode</h1>
                  <p className="text-xs text-slate-500">Plan your approach, call when ready</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Session Stats */}
              <div className="text-right">
                <div className="text-sm font-bold text-white">{accountsWorkedThisSession}</div>
                <div className="text-xs text-slate-500">worked this session</div>
              </div>

              {/* Refresh */}
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium text-slate-300"
                title="Refresh (R)"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Top Priorities Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Your Top Priorities</h2>
              <p className="text-sm text-slate-500 mt-1">
                Press 1, 2, or 3 to review an account
              </p>
            </div>
            <div className="text-sm font-medium text-slate-500">
              {summary?.totalItems ?? items.length} total in queue
            </div>
          </div>

          {/* Priority Cards Grid */}
          {topPriorities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topPriorities.map((item, index) => (
                <PriorityCard
                  key={item.itemId}
                  item={item}
                  rank={(index + 1) as 1 | 2 | 3}
                  onReview={handleReviewAccount}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900 rounded-2xl border border-slate-800">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/10 mb-4">
                <Brain size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">All Caught Up!</h3>
              <p className="text-sm text-slate-400 mb-4">
                Your queue is empty. Great work!
              </p>
              <button
                onClick={handleReturnToBreakRoom}
                className="px-4 py-2 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-700 transition-colors"
              >
                Return to Break Room
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Footer with keyboard hints */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800 py-3">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">1</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">2</kbd>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">3</kbd>
            Review priorities
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">R</kbd>
            Refresh
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">Esc</kbd>
            Break Room
          </span>
        </div>
      </footer>
    </div>
  );
}
