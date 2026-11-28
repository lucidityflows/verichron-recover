import React from 'react';
import { Phone, AlertCircle, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { type WorkQueueItemDto } from '@/api/generated/collectors_models';

interface PriorityCardProps {
  item: WorkQueueItemDto;
  rank: 1 | 2 | 3;
  onReview: (debtorId: string) => void;
}

/**
 * PriorityCard
 * Premium card display for top priority accounts in Strategy Mode
 *
 * Design Philosophy: Clean, spacious, informative
 * Shows "Why Now" reasoning to help collectors understand priority
 * Dark mode optimized
 */
export const PriorityCard: React.FC<PriorityCardProps> = ({ item, rank, onReview }) => {
  // Generate "Why Now" reasons based on item data
  const getWhyNowReasons = (): string[] => {
    const reasons: string[] = [];

    // Priority-based reasons
    if (item.priorityLabel === 'URGENT') {
      reasons.push('Flagged as urgent by system');
    }

    // Days overdue
    if (item.daysOverdue > 90) {
      reasons.push(`${item.daysOverdue} days overdue - aging account`);
    } else if (item.daysOverdue > 60) {
      reasons.push(`${item.daysOverdue} days overdue`);
    }

    // Balance-based
    if (item.totalBalance > 5000) {
      reasons.push('High balance account');
    }

    // Contact-based
    if (item.lastContactDate) {
      const daysSinceContact = Math.floor(
        (Date.now() - new Date(item.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceContact > 14) {
        reasons.push(`No contact in ${daysSinceContact} days`);
      }
    } else {
      reasons.push('No previous contact recorded');
    }

    // Tags-based reasons
    if (item.tags?.includes('broken-ptp')) {
      reasons.push('Broke promise to pay');
    }
    if (item.tags?.includes('has-payment-history')) {
      reasons.push('Has made payments before');
    }
    if (item.hasPaymentPlan) {
      reasons.push('Active payment plan');
    }
    if (item.hasOpenDispute) {
      reasons.push('Has open dispute - handle carefully');
    }

    // Return top 3 reasons
    return reasons.slice(0, 3);
  };

  const reasons = getWhyNowReasons();

  const priorityColors = {
    URGENT: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', accent: 'text-orange-400' },
    HIGH: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', accent: 'text-amber-400' },
    MEDIUM: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', accent: 'text-indigo-400' },
    LOW: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', accent: 'text-slate-400' },
  };

  const colors = priorityColors[item.priorityLabel] || priorityColors.LOW;

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden transition-all hover:border-slate-700">
      {/* Header with rank indicator */}
      <div className={cn('px-5 py-4 border-b border-slate-800', colors.bg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={cn(
              'h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold',
              rank === 1 ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
            )}>
              {rank}
            </span>
            <span className={cn('text-xs font-bold uppercase tracking-widest', colors.accent)}>
              {item.priorityLabel}
            </span>
          </div>
          {item.nextActionType && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Phone size={12} />
              {item.nextActionType}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Debtor Info */}
        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            {item.debtorName}
          </h3>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <AlertCircle size={14} className="text-slate-600" />
              {item.daysOverdue}d overdue
            </span>
            {item.lastContactDate && (
              <>
                <span className="text-slate-700">•</span>
                <span className="flex items-center gap-1">
                  <Clock size={14} className="text-slate-600" />
                  Last: {new Date(item.lastContactDate).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Balance */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white font-mono">
            ${item.totalBalance.toLocaleString()}
          </span>
          <span className="text-sm text-slate-500">owed</span>
        </div>

        {/* Why Now Section */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-600">
            Why Now
          </div>
          <ul className="space-y-1.5">
            {reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-400 rounded border border-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 bg-slate-900/50 border-t border-slate-800">
        <button
          onClick={() => onReview(item.debtorId)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg transition-colors group"
        >
          Review & Plan
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
