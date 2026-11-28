/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import React, { useState } from 'react';
import { Phone, PhoneOff, Voicemail, HandshakeIcon, DollarSign, FileText, Send } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface DispositionPanelProps {
  debtorId: string;
  onDisposition?: (type: string, data: any) => void;
}

type DispositionType =
  | 'NO_ANSWER'
  | 'LEFT_VOICEMAIL'
  | 'SPOKE_DEBTOR'
  | 'REFUSED'
  | 'PROMISE_TO_PAY'
  | 'PAYMENT_MADE'
  | 'DISPUTE'
  | 'CALLBACK_REQUESTED';

interface Disposition {
  type: DispositionType;
  label: string;
  icon: any;
  color: string;
  bgColor: string;
  requiresNote?: boolean;
  requiresAmount?: boolean;
  requiresDate?: boolean;
}

/**
 * DispositionPanel
 * One-click outcome logging with context-aware forms
 *
 * Design Philosophy: "Flow State" - Log and move on, don't break focus
 * - Common outcomes = 1 click
 * - Uncommon outcomes = 1 click + quick form
 * - Auto-advances to next account after completion
 */
export const DispositionPanel: React.FC<DispositionPanelProps> = ({
  onDisposition,
}) => {
  const [selectedDisposition, setSelectedDisposition] = useState<DispositionType | null>(null);
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  const dispositions: Disposition[] = [
    {
      type: 'NO_ANSWER',
      label: 'No Answer',
      icon: PhoneOff,
      color: 'text-slate-300',
      bgColor: 'bg-slate-800',
    },
    {
      type: 'LEFT_VOICEMAIL',
      label: 'Left Voicemail',
      icon: Voicemail,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
    },
    {
      type: 'SPOKE_DEBTOR',
      label: 'Spoke with Debtor',
      icon: Phone,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      requiresNote: true,
    },
    {
      type: 'REFUSED',
      label: 'Refused to Pay',
      icon: HandshakeIcon,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      requiresNote: true,
    },
    {
      type: 'PROMISE_TO_PAY',
      label: 'Promise to Pay',
      icon: HandshakeIcon,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      requiresAmount: true,
      requiresDate: true,
    },
    {
      type: 'PAYMENT_MADE',
      label: 'Payment Made',
      icon: DollarSign,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      requiresAmount: true,
    },
    {
      type: 'DISPUTE',
      label: 'Debtor Disputes',
      icon: FileText,
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      requiresNote: true,
    },
    {
      type: 'CALLBACK_REQUESTED',
      label: 'Callback Requested',
      icon: Phone,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      requiresDate: true,
    },
  ];

  const handleQuickDisposition = (type: DispositionType) => {
    const disposition = dispositions.find(d => d.type === type);
    if (!disposition) return;

    // If requires additional data, show form
    if (disposition.requiresNote || disposition.requiresAmount || disposition.requiresDate) {
      setSelectedDisposition(type);
    } else {
      // Instant log for simple dispositions
      onDisposition?.(type, {});
      // TODO: Show success toast and advance to next account
    }
  };

  const handleSubmitDisposition = () => {
    if (!selectedDisposition) return;

    const data: any = {};
    if (notes) data.notes = notes;
    if (amount) data.amount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (date) data.date = date;

    onDisposition?.(selectedDisposition, data);

    // Reset form
    setSelectedDisposition(null);
    setNotes('');
    setAmount('');
    setDate('');

    // TODO: Show success toast and advance to next account
  };

  const currentDisposition = dispositions.find(d => d.type === selectedDisposition);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <h3 className="text-sm font-bold uppercase tracking-tight text-slate-400 mb-4">
        Log Call Outcome
      </h3>

      {/* Quick Disposition Buttons */}
      {!selectedDisposition && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {dispositions.map((disposition) => (
            <button
              key={disposition.type}
              onClick={() => handleQuickDisposition(disposition.type)}
              className={cn(
                'px-4 py-3 rounded-lg border transition-all hover:scale-105',
                'flex flex-col items-center gap-2 text-center',
                disposition.bgColor,
                'border-slate-700 hover:border-slate-600'
              )}
            >
              <disposition.icon size={20} className={disposition.color} />
              <span className={cn('text-xs font-bold', disposition.color)}>
                {disposition.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Expanded Form (when disposition selected) */}
      {selectedDisposition && currentDisposition && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', currentDisposition.bgColor)}>
              <currentDisposition.icon size={20} className={currentDisposition.color} />
            </div>
            <div>
              <h4 className={cn('text-sm font-bold', currentDisposition.color)}>
                {currentDisposition.label}
              </h4>
              <p className="text-xs text-slate-500">Complete details below</p>
            </div>
          </div>

          {/* Amount Field */}
          {currentDisposition.requiresAmount && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">
                Amount {currentDisposition.type === 'PROMISE_TO_PAY' ? '(Promised)' : '(Paid)'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-mono text-white placeholder:text-slate-600"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Date Field */}
          {currentDisposition.requiresDate && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">
                {currentDisposition.type === 'PROMISE_TO_PAY' ? 'Payment Date' : 'Callback Date'}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-white"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          {/* Notes Field */}
          {currentDisposition.requiresNote && (
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter call details..."
                rows={4}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none text-white placeholder:text-slate-600"
                autoFocus={!currentDisposition.requiresAmount && !currentDisposition.requiresDate}
              />
              <div className="text-xs text-slate-500 mt-1">{notes.length} / 2000 characters</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={() => {
                setSelectedDisposition(null);
                setNotes('');
                setAmount('');
                setDate('');
              }}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitDisposition}
              className="flex-1 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm font-bold flex items-center justify-center gap-2"
            >
              <Send size={16} />
              Submit & Continue
              <kbd className="ml-1 px-1.5 py-0.5 bg-sky-700 rounded text-xs">Ctrl+Enter</kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
