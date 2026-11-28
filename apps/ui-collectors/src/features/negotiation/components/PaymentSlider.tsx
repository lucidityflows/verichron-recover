import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, XCircle, DollarSign } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface PaymentSliderProps {
  balance: number;
  minAllowed: number;
  maxAllowed: number;
  suggestedAmount?: number;
  onOfferChange?: (amount: number) => void;
  onSubmit?: (amount: number) => void;
}

/**
 * PaymentSlider
 * Visual settlement calculator with instant feedback
 *
 * Design Philosophy: "The Sommelier" - Recommend the right offer
 * - Green zone: Auto-approved
 * - Amber zone: Needs manager approval
 * - Red zone: Below hard floor
 * - Shows client savings (helps collector "sell" the deal)
 */
export const PaymentSlider: React.FC<PaymentSliderProps> = ({
  balance,
  minAllowed,
  maxAllowed,
  suggestedAmount,
  onOfferChange,
  onSubmit,
}) => {
  const [offer, setOffer] = useState(suggestedAmount || minAllowed);

  useEffect(() => {
    if (suggestedAmount) {
      setOffer(suggestedAmount);
    }
  }, [suggestedAmount]);

  const handleChange = (value: number) => {
    setOffer(value);
    onOfferChange?.(value);
  };

  const savings = balance - offer;
  const discount = ((savings / balance) * 100).toFixed(0);

  // Determine status based on thresholds
  const getStatus = () => {
    if (offer < minAllowed) return 'rejected';
    if (offer >= maxAllowed * 0.9) return 'approved';
    return 'needs-approval';
  };

  const status = getStatus();

  const statusConfig = {
    approved: {
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      message: 'Auto-Approved',
      description: 'You can accept this offer immediately',
    },
    'needs-approval': {
      icon: AlertCircle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      message: 'Manager Approval Required',
      description: 'Submit for escalation to team lead',
    },
    rejected: {
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      message: 'Below Minimum',
      description: `Hard floor is $${minAllowed.toLocaleString()}`,
    },
  }[status];

  const Icon = statusConfig.icon;

  // Calculate slider gradient color
  const getSliderGradient = () => {
    const greenZone = ((maxAllowed - minAllowed) / (balance - minAllowed)) * 100;

    return `linear-gradient(to right,
      #10b981 0%,
      #10b981 ${greenZone}%,
      #f59e0b ${greenZone}%,
      #f59e0b 100%)`;
  };

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div className={cn('flex items-center gap-3 px-4 py-3 rounded-lg border-2', statusConfig.bg, statusConfig.border)}>
        <Icon size={20} className={statusConfig.color} />
        <div className="flex-1">
          <div className={cn('text-sm font-bold', statusConfig.color)}>
            {statusConfig.message}
          </div>
          <div className={cn('text-xs', statusConfig.color, 'opacity-80')}>
            {statusConfig.description}
          </div>
        </div>
      </div>

      {/* Offer Amount */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
          Settlement Offer
        </div>
        <div className="relative">
          <DollarSign size={24} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={offer.toLocaleString()}
            onChange={(e) => {
              const num = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
              handleChange(Math.min(balance, Math.max(0, num)));
            }}
            className="w-full pl-12 pr-4 py-4 text-3xl font-mono font-bold bg-slate-800 border-2 border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
          />
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-2">
        <input
          type="range"
          min={0}
          max={balance}
          value={offer}
          onChange={(e) => handleChange(parseInt(e.target.value))}
          className="w-full h-3 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: getSliderGradient(),
          }}
        />
        <div className="flex justify-between text-xs font-mono text-slate-500">
          <span>$0</span>
          <span className="text-amber-400 font-bold">
            ${minAllowed.toLocaleString()} min
          </span>
          <span>${balance.toLocaleString()}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Client Savings */}
        <div className="bg-emerald-500/10 rounded-lg p-4 border border-emerald-500/30">
          <div className="text-xs font-bold text-emerald-400 mb-1">Client Saves</div>
          <div className="text-2xl font-mono font-bold text-emerald-300">
            ${savings.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-400/80">{discount}% discount</div>
        </div>

        {/* Commission Estimate */}
        <div className="bg-sky-500/10 rounded-lg p-4 border border-sky-500/30">
          <div className="text-xs font-bold text-sky-400 mb-1">Your Commission</div>
          <div className="text-2xl font-mono font-bold text-sky-300">
            ${(offer * 0.03).toFixed(2)}
          </div>
          <div className="text-xs text-sky-400/80">~3% of collected</div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onSubmit?.(offer)}
        disabled={status === 'rejected'}
        className={cn(
          'w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2',
          status === 'rejected'
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
            : 'bg-sky-600 text-white hover:bg-sky-700 active:scale-95'
        )}
      >
        {status === 'needs-approval' ? (
          <>
            <AlertCircle size={16} />
            Request Manager Approval
          </>
        ) : status === 'approved' ? (
          <>
            <CheckCircle2 size={16} />
            Submit Settlement Offer
          </>
        ) : (
          <>
            <XCircle size={16} />
            Below Minimum Threshold
          </>
        )}
      </button>

      {/* Quick Presets */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
          Quick Presets
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '50%', value: balance * 0.5 },
            { label: '60%', value: balance * 0.6 },
            { label: '75%', value: balance * 0.75 },
            { label: '90%', value: balance * 0.9 },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => handleChange(Math.round(preset.value))}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-bold transition-all',
                Math.abs(offer - preset.value) < 10
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Micro-Win Messaging */}
      {status === 'approved' && savings > 0 && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg p-4 text-center">
          <div className="text-sm font-bold mb-1">🎉 Great Deal!</div>
          <div className="text-xs opacity-90">
            Client saves ${savings.toLocaleString()} and you earn ${(offer * 0.03).toFixed(2)}
          </div>
        </div>
      )}

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1e293b;
          cursor: pointer;
          border: 3px solid #0ea5e9;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1e293b;
          cursor: pointer;
          border: 3px solid #0ea5e9;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }
      `}</style>
    </div>
  );
};
