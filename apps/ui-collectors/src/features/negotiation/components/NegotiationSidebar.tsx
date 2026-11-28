import React, { useState } from 'react';
import { DollarSign, Calculator, CreditCard, Calendar } from 'lucide-react';
import { PaymentSlider } from './PaymentSlider';
import { cn } from '@/shared/utils/cn';
import { type DebtorFocusDebtDto } from '@/api/generated/collectors_models';

interface NegotiationSidebarProps {
  debts: DebtorFocusDebtDto[];
}

type ToolType = 'settlement' | 'payment-plan' | null;

/**
 * NegotiationSidebar
 * "The Sommelier" - Provides expert recommendations
 *
 * Design Philosophy: Always visible but not intrusive
 * - Settlement calculator with instant feedback
 * - Payment plan builder (future)
 * - Commission preview
 */
export const NegotiationSidebar: React.FC<NegotiationSidebarProps> = ({ debts }) => {
  const [activeTool, setActiveTool] = useState<ToolType>('settlement');

  // Calculate total balance across all debts
  const totalBalance = debts.reduce((sum, debt) => sum + debt.currentBalance, 0);

  // Settlement thresholds (would come from backend strategy in production)
  const minAllowed = totalBalance * 0.5; // 50% hard floor
  const maxAllowed = totalBalance; // Full balance

  // Smart suggestion: 60% of balance (sweet spot for high acceptance)
  const suggestedAmount = Math.round(totalBalance * 0.6);

  const handleOfferSubmit = (amount: number) => {
    console.log('Submitting settlement offer:', amount);
    // TODO: API call to submit settlement request
  };

  if (debts.length === 0) {
    return (
      <div className="w-80 border-l border-slate-800 bg-slate-900">
        <div className="p-6">
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-800 mb-4">
              <Calculator size={32} className="text-slate-500" />
            </div>
            <p className="text-sm text-slate-500">No debts to negotiate</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 border-l border-slate-800 bg-slate-900 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
            <DollarSign size={20} className="text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Negotiation Tools</h3>
            <p className="text-xs text-slate-500">Make the right offer</p>
          </div>
        </div>

        {/* Total Balance Card */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
            Total Balance
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            ${totalBalance.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {debts.length} {debts.length === 1 ? 'account' : 'accounts'}
          </div>
        </div>
      </div>

      {/* Tool Selector */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex-shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTool('settlement')}
            className={cn(
              'px-3 py-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1',
              activeTool === 'settlement'
                ? 'bg-slate-800 text-sky-400 ring-1 ring-sky-500/30'
                : 'bg-transparent text-slate-500 hover:bg-slate-800/50'
            )}
          >
            <Calculator size={16} />
            Settlement
          </button>
          <button
            onClick={() => setActiveTool('payment-plan')}
            className={cn(
              'px-3 py-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1',
              activeTool === 'payment-plan'
                ? 'bg-slate-800 text-sky-400 ring-1 ring-sky-500/30'
                : 'bg-transparent text-slate-500 hover:bg-slate-800/50'
            )}
          >
            <Calendar size={16} />
            Payment Plan
          </button>
        </div>
      </div>

      {/* Tool Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {activeTool === 'settlement' && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                  <Calculator size={14} className="text-sky-400" />
                  Settlement Calculator
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Offer a one-time payment to settle all debts. The system will validate against your organization's settlement strategy.
                </p>
              </div>

              <PaymentSlider
                balance={totalBalance}
                minAllowed={minAllowed}
                maxAllowed={maxAllowed}
                suggestedAmount={suggestedAmount}
                onSubmit={handleOfferSubmit}
              />
            </>
          )}

          {activeTool === 'payment-plan' && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-800 mb-4">
                <CreditCard size={32} className="text-slate-500" />
              </div>
              <h4 className="text-sm font-bold text-white mb-2">Payment Plan Builder</h4>
              <p className="text-xs text-slate-500 max-w-[200px] mx-auto">
                Coming soon: Create custom payment schedules with automatic calculations
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Helper Tips */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 flex-shrink-0">
        <div className="bg-sky-500/10 rounded-lg p-3 border border-sky-500/20">
          <div className="text-xs font-bold text-sky-300 mb-1 flex items-center gap-1.5">
            <span>💡</span>
            <span>Pro Tip</span>
          </div>
          <p className="text-xs text-sky-400/80 leading-relaxed">
            Start at 60% to gauge debtor's reaction. You can always adjust up if needed.
          </p>
        </div>
      </div>
    </div>
  );
};