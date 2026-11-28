import React from 'react';
import { type WorkQueueItemDto } from '@/api/generated/collectors_models';

interface UpNextPreviewProps {
  items: WorkQueueItemDto[];
}

/**
 * UpNextPreview
 * Shows next 2 accounts in queue (non-interactive preview)
 *
 * Design Philosophy: Context without distraction
 * Helps collector mentally prepare for what's coming
 * Dark mode optimized
 */
export const UpNextPreview: React.FC<UpNextPreviewProps> = ({ items }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
      <span className="font-medium">Up Next:</span>
      {items.slice(0, 2).map((item, index) => (
        <span key={item.itemId} className="flex items-center gap-1">
          {index > 0 && <span className="text-slate-700 mx-1">•</span>}
          <span className="font-medium text-slate-400">{item.debtorName}</span>
          <span className="text-slate-600">(${item.totalBalance.toLocaleString()})</span>
        </span>
      ))}
      {items.length > 2 && (
        <span className="text-slate-600">+{items.length - 2} more</span>
      )}
    </div>
  );
};
