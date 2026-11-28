import React from 'react';
import { Lightbulb } from 'lucide-react';
import { type WorkQueueItemDto } from '@/api/generated/collectors_models';

interface WhyNowCardProps {
  item: WorkQueueItemDto;
}

/**
 * WhyNowCard
 * Explains why this account is being presented now
 *
 * Design Philosophy: System transparency
 * Helps collector understand prioritization and prepare for call
 * Dark mode optimized
 */
export const WhyNowCard: React.FC<WhyNowCardProps> = ({ item }) => {
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
    } else if (item.daysOverdue > 30) {
      reasons.push(`${item.daysOverdue} days past due`);
    }

    // Balance-based
    if (item.totalBalance > 10000) {
      reasons.push('Very high balance - priority account');
    } else if (item.totalBalance > 5000) {
      reasons.push('High balance account');
    }

    // Contact-based
    if (item.lastContactDate) {
      const daysSinceContact = Math.floor(
        (Date.now() - new Date(item.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceContact > 14) {
        reasons.push(`No contact in ${daysSinceContact} days`);
      } else if (daysSinceContact > 7) {
        reasons.push('Follow-up window optimal');
      }
    } else {
      reasons.push('First contact attempt');
    }

    // Tags-based reasons
    if (item.tags?.includes('broken-ptp')) {
      reasons.push('Broke promise to pay - needs follow-up');
    }
    if (item.tags?.includes('has-payment-history')) {
      reasons.push('Has made payments before - good prospect');
    }
    if (item.tags?.includes('responsive')) {
      reasons.push('Previously responsive debtor');
    }
    if (item.hasPaymentPlan) {
      reasons.push('Active payment plan - check status');
    }
    if (item.hasOpenDispute) {
      reasons.push('Has open dispute - handle carefully');
    }

    // Return top 3 reasons
    return reasons.slice(0, 3);
  };

  const reasons = getWhyNowReasons();

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={18} className="text-amber-400" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Why Now
        </span>
      </div>

      <ul className="space-y-3">
        {reasons.map((reason, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <span className="h-2 w-2 rounded-full bg-sky-500 mt-1.5 flex-shrink-0" />
            <span className="text-sm text-slate-300 leading-relaxed">{reason}</span>
          </li>
        ))}
      </ul>

      {/* Quick stats */}
      <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-4 text-xs text-slate-500">
        <span>
          Last contact:{' '}
          <span className="font-medium text-slate-400">
            {item.lastContactDate
              ? new Date(item.lastContactDate).toLocaleDateString()
              : 'Never'}
          </span>
        </span>
        {item.nextActionType && (
          <>
            <span className="text-slate-700">|</span>
            <span>
              Recommended:{' '}
              <span className="font-medium text-slate-400">{item.nextActionType}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
};
