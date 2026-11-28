import React, { useState } from 'react';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  XCircle
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { toast } from 'sonner';

interface ApprovalRequest {
  id: string;
  type: 'SETTLEMENT' | 'PAYMENT_PLAN' | 'ESCALATION';
  collectorName: string;
  debtorName: string;
  requestedAmount: number;
  originalBalance: number;
  reason?: string;
  createdAt: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface InterventionQueueProps {
  approvals: ApprovalRequest[];
  onApprove: (approvalId: string, notes?: string) => Promise<void>;
  onReject: (approvalId: string, reason: string) => Promise<void>;
  isProcessing?: boolean;
}

/**
 * InterventionQueue
 * Team Lead approval queue for settlement requests
 *
 * Design Philosophy: "Quick Decision Making" - 1-click approve, 2-click reject
 * - Shows pending approval requests in urgency order
 * - Green button = approve immediately
 * - Red button = opens rejection reason modal
 * - Shows settlement details and collector context
 */
export const InterventionQueue: React.FC<InterventionQueueProps> = ({
  approvals,
  onApprove,
  onReject,
  isProcessing = false,
}) => {
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  const handleApprove = async (approval: ApprovalRequest) => {
    try {
      await onApprove(approval.id);
      toast.success(`Approved ${approval.debtorName} settlement`);
    } catch (_error) {
      toast.error('Failed to approve settlement');
    }
  };

  const handleRejectClick = (approval: ApprovalRequest) => {
    setSelectedApproval(approval);
    setShowRejectionModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedApproval || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await onReject(selectedApproval.id, rejectionReason);
      toast.success(`Rejected ${selectedApproval.debtorName} settlement`);
      setShowRejectionModal(false);
      setRejectionReason('');
      setSelectedApproval(null);
    } catch (_error) {
      toast.error('Failed to reject settlement');
    }
  };

  const getUrgencyConfig = (urgency: ApprovalRequest['urgency']) => {
    const configs = {
      HIGH: {
        color: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-500',
        label: 'Urgent',
      },
      MEDIUM: {
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-500',
        label: 'Normal',
      },
      LOW: {
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        label: 'Low',
      },
    }[urgency];

    return configs;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (approvals.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-2">All Clear!</h3>
        <p className="text-xs text-slate-500">No pending approval requests at this time.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {approvals.map((approval) => {
          const urgencyConfig = getUrgencyConfig(approval.urgency);
          const settlementPercentage = ((approval.requestedAmount / approval.originalBalance) * 100).toFixed(0);
          const savings = approval.originalBalance - approval.requestedAmount;

          return (
            <div
              key={approval.id}
              className={cn(
                'bg-white rounded-xl border-2 p-5 shadow-sm transition-all hover:shadow-md',
                urgencyConfig.border
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', urgencyConfig.bg)}>
                    <AlertCircle size={20} className={urgencyConfig.color} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{approval.debtorName}</div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <User size={12} />
                      <span>{approval.collectorName}</span>
                      <span className="text-slate-300">•</span>
                      <Clock size={12} />
                      <span>{formatTimestamp(approval.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Urgency Badge */}
                <div className={cn('px-2 py-1 rounded-full text-xs font-bold', urgencyConfig.bg, urgencyConfig.color)}>
                  {urgencyConfig.label}
                </div>
              </div>

              {/* Settlement Details */}
              <div className="bg-slate-50 rounded-lg p-4 mb-3 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-slate-600">Settlement Offer</span>
                  <div className="text-right">
                    <div className="text-2xl font-mono font-bold text-slate-900">
                      ${approval.requestedAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-600">{settlementPercentage}% of balance</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <div className="text-xs font-medium text-slate-600">Original Balance</div>
                    <div className="text-sm font-mono font-bold text-slate-900">
                      ${approval.originalBalance.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-600">Client Saves</div>
                    <div className="text-sm font-mono font-bold text-emerald-600">
                      ${savings.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason (if provided) */}
              {approval.reason && (
                <div className="mb-3 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs font-bold text-blue-900 mb-1">Collector's Note:</div>
                  <p className="text-xs text-blue-700">{approval.reason}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(approval)}
                  disabled={isProcessing}
                  className={cn(
                    'flex-1 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2',
                    isProcessing
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-md'
                  )}
                >
                  <CheckCircle2 size={16} />
                  Approve Settlement
                </button>
                <button
                  onClick={() => handleRejectClick(approval)}
                  disabled={isProcessing}
                  className={cn(
                    'px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 border-2',
                    isProcessing
                      ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                      : 'border-red-500 text-red-600 hover:bg-red-50 active:scale-95'
                  )}
                >
                  <XCircle size={16} />
                  Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && selectedApproval && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reject Settlement</h3>
                <p className="text-sm text-slate-600">{selectedApproval.debtorName}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">Reason for Rejection</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this settlement is being rejected..."
                className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm resize-none"
                rows={4}
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRejectionModal(false);
                  setRejectionReason('');
                  setSelectedApproval(null);
                }}
                className="flex-1 py-2 rounded-lg font-bold text-sm border-2 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectionReason.trim()}
                className={cn(
                  'flex-1 py-2 rounded-lg font-bold text-sm',
                  !rejectionReason.trim()
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                )}
              >
                Reject Settlement
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
