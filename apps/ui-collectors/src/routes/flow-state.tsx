import { useState, useCallback } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Zap, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useHotkey } from '@/shared/contexts/HotkeysContext';
import { useWorkQueue } from '@/features/queue/hooks/useWorkQueue';
import { useCollectorPreferences } from '@/shared/store/collectorPreferencesStore';
import { CountdownTimer } from '@/features/flow-state/components/CountdownTimer';
import { WhyNowCard } from '@/features/flow-state/components/WhyNowCard';
import { UpNextPreview } from '@/features/flow-state/components/UpNextPreview';

export const Route = createFileRoute('/flow-state')({
  component: FlowStatePage,
});

type FlowPhase = 'PREVIEW' | 'CALLING' | 'DISPOSITION' | 'TRANSITIONING';

/**
 * Flow State Page
 * System-led work mode with auto-connect after countdown
 *
 * Design Philosophy: "Keep me in the zone"
 * System manages queue, collector focuses on conversations
 * Dark mode for reduced eye strain during long sessions
 */
function FlowStatePage() {
  const navigate = useNavigate();
  const { items, isLoading, refetch } = useWorkQueue();
  const {
    endSession,
    countdownSeconds,
    skipsRemaining,
    useSkip,
    accountsWorkedThisSession,
  } = useCollectorPreferences();

  const [phase, setPhase] = useState<FlowPhase>('PREVIEW');
  const [currentIndex, setCurrentIndex] = useState(0);

  // Current account being worked
  const currentItem = items[currentIndex];
  const upNextItems = items.slice(currentIndex + 1);

  // Keyboard shortcuts
  useHotkey('ESCAPE', () => handleReturnToBreakRoom());
  useHotkey('SPACE', () => {
    if (phase === 'PREVIEW') handleConnectNow();
  });
  useHotkey('S', () => {
    if (phase === 'PREVIEW') handleSkip();
  });

  const handleReturnToBreakRoom = () => {
    endSession();
    navigate({ to: '/' });
  };

  const handleConnectNow = useCallback(() => {
    if (!currentItem) return;

    setPhase('CALLING');

    // TODO: Integrate with Twilio to actually make the call
    // For now, navigate to workbench
    toast.success('Connecting call...', {
      description: `Calling ${currentItem.debtorName}`,
    });

    // Navigate to workbench for now (will integrate Twilio later)
    setTimeout(() => {
      navigate({
        to: '/workbench/$debtorId',
        params: { debtorId: currentItem.debtorId },
      });
    }, 500);
  }, [currentItem, navigate]);

  const handleCountdownComplete = useCallback(() => {
    handleConnectNow();
  }, [handleConnectNow]);

  const handleSkip = useCallback(() => {
    if (!currentItem) return;

    const canSkip = useSkip();
    if (!canSkip) {
      toast.error('No skips remaining', {
        description: 'Skips reset every hour. Please work this account.',
      });
      return;
    }

    toast.info('Account skipped', {
      description: `${currentItem.debtorName} will appear later in your queue.`,
    });

    // Move to next account
    setPhase('TRANSITIONING');
    setTimeout(() => {
      if (currentIndex < items.length - 1) {
        setCurrentIndex((prev) => prev + 1);
        setPhase('PREVIEW');
      } else {
        // No more items
        void refetch();
        setCurrentIndex(0);
        setPhase('PREVIEW');
      }
    }, 300);
  }, [currentItem, currentIndex, items.length, useSkip, refetch]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-slate-700 border-t-sky-500" />
          <p className="text-sm font-medium text-slate-400">Entering Flow State...</p>
        </div>
      </div>
    );
  }

  // Empty queue state
  if (!currentItem) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-emerald-500/10">
            <Zap size={40} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">All Caught Up!</h2>
            <p className="text-slate-400">Your queue is empty. Amazing work!</p>
          </div>
          <div className="text-sm text-slate-500">
            Worked <span className="font-bold text-white">{accountsWorkedThisSession}</span> accounts this session
          </div>
          <button
            onClick={handleReturnToBreakRoom}
            className="px-6 py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-colors"
          >
            Return to Break Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
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
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                  <Zap size={20} className="text-sky-400" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Flow State</h1>
                  <p className="text-xs text-slate-500">System-led · Auto-connect enabled</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Session Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="text-right">
                  <div className="font-bold text-white">{accountsWorkedThisSession}</div>
                  <div className="text-xs text-slate-500">worked</div>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div className="text-right">
                  <div className="font-bold text-white">{skipsRemaining}</div>
                  <div className="text-xs text-slate-500">skips left</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] px-6 pt-6 pb-28">
        {phase === 'PREVIEW' && (
          <div className="text-center space-y-8 max-w-2xl">
            {/* Account Header */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-widest text-sky-400">
                Connecting In
              </div>
            </div>

            {/* Countdown Timer */}
            <CountdownTimer
              seconds={countdownSeconds}
              onComplete={handleCountdownComplete}
              onConnectNow={handleConnectNow}
              onSkip={handleSkip}
              skipsRemaining={skipsRemaining}
            />

            {/* Debtor Info */}
            <div className="space-y-3">
              <h2 className="text-4xl font-bold text-white">{currentItem.debtorName}</h2>
              <div className="flex items-center justify-center gap-4 text-lg text-slate-400">
                <span className="font-mono font-bold text-white">
                  ${currentItem.totalBalance.toLocaleString()}
                </span>
                <span className="text-slate-600">•</span>
                <span>{currentItem.daysOverdue}d overdue</span>
              </div>
            </div>

            {/* Why Now Card */}
            <div className="flex justify-center">
              <WhyNowCard item={currentItem} />
            </div>
          </div>
        )}

        {phase === 'CALLING' && (
          <div className="text-center space-y-6">
            <div className="h-20 w-20 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center animate-pulse">
              <Phone size={40} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Connecting...</h2>
              <p className="text-slate-400">Calling {currentItem.debtorName}</p>
            </div>
          </div>
        )}

        {phase === 'TRANSITIONING' && (
          <div className="text-center space-y-6">
            <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-slate-700 border-t-sky-500" />
            <p className="text-sm font-medium text-slate-400">Loading next account...</p>
          </div>
        )}
      </main>

      {/* Footer with Up Next */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800 py-4">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <UpNextPreview items={upNextItems} />

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">Space</kbd>
                Connect now
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">S</kbd>
                Skip
              </span>
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-slate-400">Esc</kbd>
                Break Room
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
