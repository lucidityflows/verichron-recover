import { useState } from 'react';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useWorkQueue } from '@/features/queue/hooks/useWorkQueue';
import { SmartPlaylist } from '@/features/queue/components/SmartPlaylist';
import { useHotkey } from '@/shared/contexts/HotkeysContext';
import { WorkQueuePriority } from '@/api/generated/collectors_models';
import { 
  Zap,
  Layers,
  RefreshCw,
  ArrowLeft,
 } from 'lucide-react';

export const Route = createFileRoute('/queue')({
  component: QueuePage,
});

/**
 * QueuePage
 * The "Playlist" - Smart-sorted work queue
 *
 * Design Philosophy: System prioritizes, collector executes
 * Keyboard: j/k navigate, Enter select, Q return to dashboard
 */
function QueuePage() {
  const [focusMode, setFocusMode] = useState<'ALL' | 'URGENT'>('ALL');
  const navigate = useNavigate();

  const { items, summary, isLoading, refetch } = useWorkQueue({
    priority: focusMode === 'URGENT' ? WorkQueuePriority.URGENT : undefined
  });

  // Q = return to dashboard
  useHotkey('Q', () => {
    navigate({ to: '/' });
  });

  // R = refresh queue
  useHotkey('R', () => {
    refetch();
  });

  // F = toggle focus mode
  useHotkey('F', () => {
    setFocusMode(prev => prev === 'ALL' ? 'URGENT' : 'ALL');
  });

  const handleSelectItem = (debtorId: string) => {
    navigate({ to: '/workbench/$debtorId', params: { debtorId } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
          <p className="text-sm font-medium text-slate-600">Loading your queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate({ to: '/' })}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Back to Dashboard (Q)"
              >
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Work Queue</h1>
                <p className="text-sm text-slate-600">Smart-sorted by priority</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
                title="Refresh Queue (R)"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setFocusMode('ALL')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${
                    focusMode === 'ALL' 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Layers size={14} />
                  All
                </button>
                <button
                  onClick={() => setFocusMode('URGENT')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all ${
                    focusMode === 'URGENT' 
                      ? 'bg-white text-red-600 shadow-sm' 
                      : 'text-slate-500 hover:text-red-600'
                  }`}
                  title="Toggle Focus Mode (F)"
                >
                  <Zap size={14} />
                  Urgent
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Total Items
              </div>
              <div className="text-3xl font-mono font-bold text-slate-900">
                {summary.totalItems}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Total Balance
              </div>
              <div className="text-3xl font-mono font-bold text-slate-900">
                ${(summary.totalBalanceInQueue / 100).toLocaleString()}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Urgent Items
              </div>
              <div className="text-3xl font-mono font-bold text-red-600">
                {summary.urgentItemsCount}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                Completed Today
              </div>
              <div className="text-3xl font-mono font-bold text-emerald-600">
                {summary.completedTodayCount}
              </div>
            </div>
          </div>
        )}

        {/* Smart Playlist */}
        <div className="max-w-3xl mx-auto">
          <SmartPlaylist items={items} onSelectItem={handleSelectItem} />
        </div>
      </div>
    </div>
  );
}
