import React, { useState, useCallback } from 'react';
import { MessageCircle, Lightbulb, AlertTriangle, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

import { useUser } from '@/shared/store/userStore';
import { useCollectorPreferences } from '@/shared/store/collectorPreferencesStore';

interface SmartScriptProps {
  debtorName?: string;
  _debtorId?: string;
  accountNumber?: string;
  balance?: number;
  daysOverdue?: number;
  lastContactType?: 'CALL' | 'EMAIL' | 'LETTER' | null;
  promiseToPay?: {
    amount: number;
    date: string;
    broken: boolean;
  } | null;
  /** Optional initial notes from strategy planning */
  initialNotes?: string;
  /** Callback when notes are updated */
  onNotesChange?: (notes: string) => void;
}

/**
 * SmartScript
 * Dynamic call script that adapts based on debtor context
 */
export const SmartScript: React.FC<SmartScriptProps> = ({
  _debtorId,
  debtorName,
  accountNumber,
  balance = 0,
  daysOverdue = 0,
  lastContactType,
  promiseToPay,
  initialNotes = '',
  onNotesChange,
}) => {
  const { user } = useUser();
  const { currentMode } = useCollectorPreferences();
  const userName = user?.name || '[Your Name]';
  const companyName = 'Verichron Inc.';

  // Collector notes state (for Strategy Mode planning)
  const [notes, setNotes] = useState(initialNotes);
  const [showNotes, setShowNotes] = useState(!!initialNotes || currentMode === 'STRATEGY_MODE');

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    onNotesChange?.(newNotes);
  }, [onNotesChange]);

  const Highlight: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="font-bold text-sky-400 underline decoration-sky-500/30 underline-offset-2">{children}</span>
  );

  // Determine script variant based on context
  const getScriptVariant = () => {
    if (promiseToPay?.broken) return 'BROKEN_PROMISE';
    if (lastContactType === 'CALL' && daysOverdue > 30) return 'FOLLOW_UP';
    if (daysOverdue > 90) return 'LATE_STAGE';
    if (daysOverdue < 30) return 'EARLY_STAGE';
    return 'STANDARD';
  };

  const variant = getScriptVariant();

  const scripts = {
    BROKEN_PROMISE: {
      title: 'Broken Promise Follow-Up',
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      opening: (
        <>
          Hi {debtorName}, this is <Highlight>{userName}</Highlight> calling about your account ending in {accountNumber?.slice(-4)}.
          I wanted to follow up on the payment you mentioned you'd make on <Highlight>{promiseToPay?.date ? new Date(promiseToPay.date).toLocaleDateString() : '[date]'}</Highlight>.
          I don't see that payment reflected yet.
        </>
      ),
      keyPoints: [
        'Remind them of the specific commitment',
        'Ask what changed or what prevented payment',
        'Propose a new, smaller payment to rebuild trust',
      ],
      complianceNote: 'Keep tone professional, not accusatory. FDCPA prohibits harassment.',
    },
    LATE_STAGE: {
      title: 'Late-Stage Collection',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      opening: (
        <>
          Hi {debtorName}, this is <Highlight>{userName}</Highlight> calling from <Highlight>{companyName}</Highlight> regarding an important matter about your account ending in {accountNumber?.slice(-4)}.
          This account is now <Highlight>{daysOverdue}</Highlight> days past due with a balance of <Highlight>${balance.toLocaleString()}</Highlight>.
          I'm calling to discuss resolution options.
        </>
      ),
      keyPoints: [
        'Emphasize urgency without threatening',
        'Offer payment plan options',
        'Mention potential settlement discount if authorized',
      ],
      complianceNote: 'Avoid threats of legal action unless authorized. Document all offers.',
    },
    EARLY_STAGE: {
      title: 'Early-Stage Outreach',
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/30',
      opening: (
        <>
          Hi {debtorName}, this is <Highlight>{userName}</Highlight> calling from <Highlight>{companyName}</Highlight>.
          I'm reaching out about your account ending in {accountNumber?.slice(-4)}.
          Our records show a balance of <Highlight>${balance.toLocaleString()}</Highlight> that's past due.
          I wanted to see if there's anything I can help with.
        </>
      ),
      keyPoints: [
        'Assume positive intent (maybe they forgot)',
        'Ask if there are any issues with the service/product',
        'Offer to set up automatic payments for convenience',
      ],
      complianceNote: 'This is relationship-building. Keep it friendly and helpful.',
    },
    FOLLOW_UP: {
      title: 'Follow-Up Call',
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
      borderColor: 'border-violet-500/30',
      opening: (
        <>
          Hi {debtorName}, this is <Highlight>{userName}</Highlight> calling back from <Highlight>{companyName}</Highlight> about your account ending in {accountNumber?.slice(-4)}.
          I spoke with you previously about the balance of <Highlight>${balance.toLocaleString()}</Highlight>.
        </>
      ),
      keyPoints: [
        'Reference the previous conversation',
        'Ask if circumstances have changed',
        'Propose concrete next steps',
      ],
      complianceNote: 'Note that this is a follow-up, not initial contact.',
    },
    STANDARD: {
      title: 'Standard Outreach',
      color: 'text-slate-300',
      bgColor: 'bg-slate-800',
      borderColor: 'border-slate-700',
      opening: (
        <>
          Hi {debtorName}, this is <Highlight>{userName}</Highlight> calling from <Highlight>{companyName}</Highlight> regarding your account ending in {accountNumber?.slice(-4)}.
          I'm calling about a past due balance of <Highlight>${balance.toLocaleString()}</Highlight>.
        </>
      ),
      keyPoints: [
        'State purpose clearly and directly',
        'Listen for debtor\'s situation',
        'Offer payment options',
      ],
      complianceNote: 'Standard FDCPA mini-miranda applies.',
    },
  };

  const script = scripts[variant];

  return (
    <div className={cn('rounded-xl border-2 p-6', script.bgColor, script.borderColor)}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center border', script.borderColor)}>
            <MessageCircle size={20} className={script.color} />
          </div>
          <div>
            <h3 className={cn('text-sm font-bold uppercase tracking-tight', script.color)}>
              {script.title}
            </h3>
            <p className="text-xs text-slate-500">Context-aware script suggestion</p>
          </div>
        </div>
      </div>

      {/* Opening Script */}
      <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
          Suggested Opening
        </div>
        <div className="text-sm leading-relaxed text-slate-300">
          {script.opening}
        </div>
      </div>

      {/* Key Talking Points */}
      <div className="mb-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
          <Lightbulb size={14} className="text-amber-400" />
          Key Points
        </div>
        <ul className="space-y-2">
          {script.keyPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="text-slate-600 mt-1">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Compliance Note */}
      <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/30">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-amber-300 mb-1">Compliance Note</div>
            <div className="text-xs text-amber-400/80">{script.complianceNote}</div>
          </div>
        </div>
      </div>

      {/* Collector Notes Section (Strategy Mode) */}
      <div className="mt-4">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center justify-between w-full px-3 py-2 bg-slate-800 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <StickyNote size={16} className="text-violet-400" />
            <span className="text-sm font-medium text-slate-300">
              My Notes
              {notes && !showNotes && (
                <span className="ml-2 text-xs text-slate-500">(has content)</span>
              )}
            </span>
          </div>
          {showNotes ? (
            <ChevronUp size={16} className="text-slate-500" />
          ) : (
            <ChevronDown size={16} className="text-slate-500" />
          )}
        </button>

        {showNotes && (
          <div className="mt-2 bg-slate-800 rounded-lg border border-slate-700 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Pre-Call Planning Notes
              </span>
              {currentMode === 'STRATEGY_MODE' && (
                <span className="text-[10px] font-medium text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/30">
                  Strategy Mode
                </span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Jot down your approach, questions to ask, or key points to remember..."
              className="w-full h-24 px-3 py-2 text-sm text-slate-300 bg-slate-900 border border-slate-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-600"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>These notes are private and won't be saved to the account.</span>
              {notes && (
                <button
                  onClick={() => {
                    setNotes('');
                    onNotesChange?.('');
                  }}
                  className="text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};