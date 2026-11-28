/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises */
import { useState, useEffect, useCallback } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Loader2, Coffee, Zap, Brain, PhoneOff, Phone, Clock } from 'lucide-react';
import { useDebtorFocus } from '@/features/workbench/hooks/useDebtorFocus';
import { DebtorHero } from '@/features/workbench/components/DebtorHero';
import { SmartScript } from '@/features/workbench/components/SmartScript';
import { DispositionPanel } from '@/features/workbench/components/DispositionPanel';
import { ContextTimeline } from '@/features/workbench/components/ContextTimeline';
import { NegotiationSidebar } from '@/features/negotiation/components/NegotiationSidebar';
import { useHotkey } from '@/shared/contexts/HotkeysContext';
import { cn } from '@/shared/utils/cn';

import { useWorkQueue } from '@/features/queue/hooks/useWorkQueue';
import { toast } from 'sonner';

import {
  useTimeTrackingControllerGetActiveSession,
  useTimeTrackingControllerStartSession
} from '@/api/generated/collectors/endpoints/collector-time-tracking/collector-time-tracking';
import { useUserStore } from '@/shared/store/userStore';
import { useCollectorPreferences } from '@/shared/store/collectorPreferencesStore';
import { Play, ShieldAlert } from 'lucide-react';

type CallStatus = 'idle' | 'connecting' | 'connected' | 'ended';

export const Route = createFileRoute('/workbench/$debtorId')({
  component: WorkbenchPage,
});

/**
 * WorkbenchPage
 * Focus Mode - Deep work on a single debtor
 */
function WorkbenchPage() {
  const { debtorId } = Route.useParams();
  const { organizationId } = useUserStore();
  const { data, isLoading, isError, error } = useDebtorFocus(debtorId);
  const { getNextDebtorId, items } = useWorkQueue();
  const navigate = useNavigate();
  const { currentMode, isInSession, incrementAccountsWorked } = useCollectorPreferences();

  // Call state management
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);

  // Call duration timer
  useEffect(() => {
    if (callStatus !== 'connected' || !callStartTime) return;

    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [callStatus, callStartTime]);

  // Format call duration as MM:SS
  const formatDuration = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Find relevant work queue item for this debtor
  const workItem = items.find(i => i.debtorId === debtorId);

  // Determine return destination based on work mode
  const getReturnDestination = () => {
    if (currentMode === 'FLOW_STATE') return '/flow-state';
    if (currentMode === 'STRATEGY_MODE') return '/strategy';
    return '/'; // Break Room fallback
  };

  const getModeLabel = () => {
    if (currentMode === 'FLOW_STATE') return 'Flow State';
    if (currentMode === 'STRATEGY_MODE') return 'Strategy Mode';
    return 'Break Room';
  };

  const getModeIcon = () => {
    if (currentMode === 'FLOW_STATE') return <Zap size={16} className="text-sky-600" />;
    if (currentMode === 'STRATEGY_MODE') return <Brain size={16} className="text-violet-600" />;
    return <Coffee size={16} className="text-slate-600" />;
  };

  // Session Management
  const activeSessionQuery = useTimeTrackingControllerGetActiveSession(organizationId!);
  const startSessionMutation = useTimeTrackingControllerStartSession();

  const activeSession = activeSessionQuery.data?.data;
  const isWorkingThisDebtor = activeSession?.debtorId === debtorId;

  const handleStartWorking = async () => {
    try {
      await startSessionMutation.mutateAsync({
        organizationId: organizationId!,
        data: {
          debtorId,
          metadata: {
            workItemId: workItem?.itemId,
            source: 'workbench_direct'
          }
        }
      });
      toast.success('Work session started. Account activated.');
      void activeSessionQuery.refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start work session';
      toast.error(message);
    }
  };

  // Call control handlers
  const handleStartCall = useCallback(() => {
    setCallStatus('connecting');
    // Simulate connection delay (replace with Twilio integration)
    setTimeout(() => {
      setCallStatus('connected');
      setCallStartTime(Date.now());
      toast.success('Call connected');
    }, 1500);
  }, []);

  const handleEndCall = useCallback(() => {
    setCallStatus('ended');
    setCallStartTime(null);
    toast.info(`Call ended • Duration: ${formatDuration(callDuration)}`);
    // After ending call, show disposition panel to log outcome
  }, [callDuration, formatDuration]);

  const handleAutoAdvance = () => {
    // Increment accounts worked when completing a call
    incrementAccountsWorked();

    const nextId = getNextDebtorId(debtorId);

    // In Flow State, auto-advance to next account
    if (currentMode === 'FLOW_STATE' && nextId) {
      toast.success('Loading next account...');
      void navigate({ to: '/workbench/$debtorId', params: { debtorId: nextId } });
      return;
    }

    // In Strategy Mode or when queue is empty, return to mode screen
    if (nextId) {
      toast.success(`Account complete. ${getModeLabel()} has more work queued.`);
    } else {
      toast.success('Queue complete! Great work.');
    }
    void navigate({ to: getReturnDestination() });
  };

  // Escape = return to current mode (or end call if in call)
  useHotkey('ESCAPE', () => {
    if (callStatus === 'connected') {
      handleEndCall();
    } else {
      navigate({ to: getReturnDestination() });
    }
  });

  // Q = return to Break Room
  useHotkey('Q', () => {
    if (callStatus !== 'connected') {
      navigate({ to: '/' });
    }
  });

  // E = end call
  useHotkey('E', () => {
    if (callStatus === 'connected') {
      handleEndCall();
    }
  });

  if (isLoading || activeSessionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-sky-500" />
          <p className="text-sm font-medium text-slate-400">Loading focus view...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <ArrowLeft size={32} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Failed to Load Debtor</h2>
          <p className="text-sm text-slate-400">{(error as Error)?.message || 'Unknown error'}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate({ to: getReturnDestination() })}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 text-sm font-medium text-slate-300"
            >
              Back to {getModeLabel()}
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

  const debtor = data?.data?.debtor;
  const timeline = data?.data?.timeline || [];
  const debts = data?.data?.debts || [];
  const summary = data?.data?.summary;

  if (!debtor) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">Debtor Not Found</h2>
          <button onClick={() => navigate({ to: getReturnDestination() })} className="text-sky-400 hover:underline mt-2">
            Return to {getModeLabel()}
          </button>
        </div>
      </div>
    );
  }

  const displayName = isWorkingThisDebtor 
    ? `${debtor.firstName} ${debtor.lastName}` 
    : `${debtor.firstName.charAt(0)}... ${debtor.lastName.charAt(0)}...`;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 relative">
      {/* Session Enforcement Overlay */}
      {!isWorkingThisDebtor && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 p-10 max-w-lg w-full text-center space-y-6">
            <div className="h-20 w-20 bg-sky-500/10 rounded-full flex items-center justify-center mx-auto border-2 border-sky-500/20">
              <ShieldAlert size={40} className="text-sky-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">Work Session Required</h2>
              <p className="text-slate-400 leading-relaxed">
                You are currently viewing <span className="font-bold text-white">{displayName}</span>.
                Activating this session will grant you access to PII and log your interaction for compliance auditing.
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <button
                onClick={handleStartWorking}
                disabled={startSessionMutation.isPending}
                className="w-full bg-sky-600 text-white rounded-2xl py-4 font-bold text-lg hover:bg-sky-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-sky-500/20 active:scale-95"
              >
                {startSessionMutation.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Play size={20} className="fill-current" />
                    Activate Full Access
                  </>
                )}
              </button>
              <button
                onClick={() => navigate({ to: getReturnDestination() })}
                className="w-full text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-slate-300 transition-colors"
              >
                Return to {getModeLabel()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prominent Call Control Bar - Fixed at top when in call */}
      {isWorkingThisDebtor && callStatus !== 'idle' && (
        <div className={cn(
          "fixed top-0 left-0 right-0 z-50 px-6 py-4",
          callStatus === 'connected' ? "bg-emerald-600" : callStatus === 'connecting' ? "bg-amber-600" : "bg-slate-800"
        )}>
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Call Status Indicator */}
              <div className={cn(
                "h-12 w-12 rounded-full flex items-center justify-center",
                callStatus === 'connected' ? "bg-white/20 animate-pulse" : "bg-white/10"
              )}>
                <Phone size={24} className="text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-lg">
                  {callStatus === 'connecting' && 'Connecting...'}
                  {callStatus === 'connected' && `On Call with ${debtor.firstName}`}
                  {callStatus === 'ended' && 'Call Ended'}
                </div>
                {callStatus === 'connected' && (
                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <Clock size={14} />
                    <span className="font-mono tabular-nums">{formatDuration(callDuration)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* End Call Button - Large and prominent */}
            {callStatus === 'connected' && (
              <button
                onClick={handleEndCall}
                className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-600/30 active:scale-95"
              >
                <PhoneOff size={20} />
                End Call
                <kbd className="ml-2 px-2 py-0.5 bg-red-700 rounded text-xs font-mono">E</kbd>
              </button>
            )}

            {callStatus === 'ended' && (
              <div className="text-white/80 text-sm">
                Duration: {formatDuration(callDuration)} • Log disposition below
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Workbench (80%) */}
      <div className={cn(
        "flex-1 flex flex-col overflow-y-auto transition-all duration-700 ease-in-out",
        !isWorkingThisDebtor && "filter blur-2xl pointer-events-none scale-[0.98] opacity-30 grayscale",
        callStatus !== 'idle' && isWorkingThisDebtor && "pt-20" // Add padding when call bar is shown
      )}>
        {/* Header Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => navigate({ to: getReturnDestination() })}
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            Back to {getModeLabel()}
          </button>
          <div className="flex items-center gap-4">
            {/* Mode Indicator */}
            {isInSession && (
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                {getModeIcon()}
                <span className="text-xs font-medium text-slate-400">{getModeLabel()}</span>
              </div>
            )}

            {/* Call / Complete Controls */}
            {callStatus === 'idle' && (
              <button
                onClick={handleStartCall}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
              >
                <Phone size={16} />
                Start Call
              </button>
            )}

            {(callStatus === 'ended' || callStatus === 'idle') && (
              <button
                onClick={handleAutoAdvance}
                className={cn(
                  "text-xs font-bold px-3 py-2 rounded-lg transition-colors",
                  currentMode === 'FLOW_STATE'
                    ? "text-sky-400 hover:text-sky-300 bg-sky-500/10 border border-sky-500/20"
                    : "text-violet-400 hover:text-violet-300 bg-violet-500/10 border border-violet-500/20"
                )}
              >
                {currentMode === 'FLOW_STATE' ? 'Next Account →' : 'Complete & Return'}
              </button>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <kbd className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-400">Esc</kbd>
              <span>{callStatus === 'connected' ? 'End call' : `to ${getModeLabel()}`}</span>
            </div>
          </div>
        </div>

        {/* Debtor Hero */}
        <DebtorHero 
          debtor={debtor} 
          totalBalance={summary?.totalDebt}
          daysOverdue={debts[0]?.daysOverdue}
          lastContactDate={summary?.oldestDebtDate as unknown as string} // Fallback or use summary correctly
          riskLevel="MEDIUM" 
        />

        {/* Main Content Area */}
        <div className="flex-1 p-8 space-y-6 bg-slate-950">
          {/* SmartScript Component */}
          <SmartScript
            debtorName={debtor.firstName}
            _debtorId={debtorId}
            accountNumber={debts[0]?.accountNumber}
            balance={summary?.totalDebt}
            daysOverdue={debts[0]?.daysOverdue}
            lastContactType={timeline[0]?.eventType as any}
            promiseToPay={null} // TODO: Extract from timeline
          />

          {/* DispositionPanel Component */}
          <DispositionPanel
            debtorId={debtorId}
            onDisposition={(type, data) => {
              console.log('Disposition logged:', type, data);
              // TODO: API call to log disposition
              handleAutoAdvance();
            }}
          />

          {/* ContextTimeline Component */}
          <ContextTimeline events={timeline} limit={10} />
        </div>
      </div>

      {/* Negotiation Sidebar (20%) */}
      <div className={cn(
        "w-80 transition-all duration-700 ease-in-out border-l border-slate-800 bg-slate-900",
        !isWorkingThisDebtor && "filter blur-2xl pointer-events-none opacity-30 grayscale"
      )}>
        <NegotiationSidebar debts={debts} />
      </div>
    </div>
  );
}