import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2, ArrowLeft, Users, Bell } from 'lucide-react';
import { useFloorStatus } from '@/features/floor/hooks/useFloorStatus';
import { FloorMap } from '@/features/floor/components/FloorMap';
import { InterventionQueue } from '@/features/floor/components/InterventionQueue';
import { LiveFeed } from '@/features/floor/components/LiveFeed';
import { useHotkey } from '@/shared/contexts/HotkeysContext';
import { useState } from 'react';

export const Route = createFileRoute('/floor')({
  component: FloorPage,
});

/**
 * FloorPage
 * "The Maitre D's View" - Team Lead monitoring dashboard
 *
 * Design Philosophy: Real-time visibility + quick intervention
 * - FloorMap shows all collectors at a glance
 * - InterventionQueue for settlement approvals
 * - LiveFeed for real-time team activity
 * - Auto-refreshes every 10 seconds
 */
function FloorPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'floor' | 'approvals'>('floor');
  const {
    collectors,
    teamStats,
    approvals,
    actions,
    isLoading,
    isError,
    error,
    approveSettlement,
    rejectSettlement,
    isApproving,
    isRejecting,
  } = useFloorStatus();

  // Keyboard shortcuts
  useHotkey('ESCAPE', () => {
    void navigate({ to: '/' });
  });

  useHotkey('1', () => setActiveTab('floor'));
  useHotkey('2', () => setActiveTab('approvals'));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-purple-600" />
          <p className="text-sm font-medium text-slate-600">Loading team status...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center space-y-4 max-w-md">
          <div className="h-16 w-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
            <Users size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Failed to Load Team Status</h2>
          <p className="text-sm text-slate-600">{(error)?.message || 'Unknown error'}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { void navigate({ to: '/' }); }}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pendingApprovalsCount = approvals.length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { void navigate({ to: '/' }); }}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
            <div className="h-6 w-px bg-slate-300" />
            <div className="flex items-center gap-2">
              <Users size={18} className="text-purple-600" />
              <h1 className="text-lg font-bold text-slate-900">Floor View</h1>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                Team Lead
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Team Stats Summary */}
            {teamStats && (
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-slate-600">Collected: </span>
                  <span className="font-mono font-bold text-emerald-600">
                    ${(teamStats.totalCollected / 100).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600">Calls: </span>
                  <span className="font-mono font-bold text-slate-900">{teamStats.totalCalls || 0}</span>
                </div>
                <div>
                  <span className="text-slate-600">Avg Progress: </span>
                  <span className="font-mono font-bold text-indigo-600">
                    {teamStats.avgGoalProgress?.toFixed(0) || '0'}%
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <kbd className="px-2 py-0.5 bg-slate-100 rounded border border-slate-300">Esc</kbd>
              <span>to go back</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('floor')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'floor'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              Floor Map ({collectors.length})
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">1</kbd>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors relative ${
              activeTab === 'approvals'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Bell size={16} />
              Approvals
              {pendingApprovalsCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-xs font-bold min-w-[20px] text-center">
                  {pendingApprovalsCount}
                </span>
              )}
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">2</kbd>
            </div>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {activeTab === 'floor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Floor Map - 2/3 width */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-tight text-slate-700 mb-4">Team Status</h2>
                <FloorMap collectors={collectors} onSelectCollector={(id) => console.log('Selected collector:', id)} />
              </div>
            </div>

            {/* Live Feed - 1/3 width */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-tight text-slate-700 mb-4">Live Activity</h2>
              <LiveFeed events={actions} />
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-tight text-slate-700 mb-2">Pending Approvals</h2>
              <p className="text-xs text-slate-600">
                Review and approve settlement requests from your team. Approvals are processed instantly.
              </p>
            </div>

            <InterventionQueue
              approvals={approvals}
              onApprove={async (approvalId: string) => {
                await approveSettlement({ approvalId });
              }}
              onReject={async (approvalId: string, reason: string) => {
                await rejectSettlement({ approvalId, reason });
              }}
              isProcessing={isApproving || isRejecting}
            />
          </div>
        )}
      </div>
    </div>
  );
}
