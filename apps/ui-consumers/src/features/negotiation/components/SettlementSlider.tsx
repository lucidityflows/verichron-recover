import { useState } from 'react';
import { Info } from 'lucide-react';

interface SettlementSliderProps {
  balance: number;
  minAllowedPercent: number; // e.g., 60
  onOfferChange: (amount: number) => void;
}

export function SettlementSlider({ balance, minAllowedPercent, onOfferChange }: SettlementSliderProps) {
  const [percent, setPercent] = useState(100);
  const amount = (balance * (percent / 100));
  const savings = balance - amount;
  
  const isApproved = percent >= minAllowedPercent;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setPercent(val);
    onOfferChange(balance * (val / 100));
  };

  return (
    <div className="space-y-8 p-1">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Your Offer</p>
          <p className="text-4xl font-bold tracking-tight">${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm font-medium text-success uppercase tracking-wider">You Save</p>
          <p className="text-2xl font-bold text-success">-${savings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="relative pt-6 pb-2">
        <input
          type="range"
          min="10"
          max="100"
          step="1"
          value={percent}
          onChange={handleSliderChange}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
        />
        <div className="flex justify-between mt-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
          <span>10%</span>
          <span>50%</span>
          <span>Full Balance</span>
        </div>
      </div>

      <div className={`p-4 rounded-2xl border transition-colors flex gap-3 ${
        isApproved 
          ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
          : 'bg-amber-50/50 border-amber-100 text-amber-800'
      }`}>
        <Info className="h-5 w-5 flex-shrink-0 mt-0.5 opacity-80" />
        <div className="text-sm leading-relaxed">
          {isApproved ? (
            <p><strong>Approved!</strong> This offer meets our resolution criteria. You can finalize this settlement immediately.</p>
          ) : (
            <p><strong>Review Required.</strong> This offer is lower than our standard threshold. It will be sent to a manager for manual approval (usually within 24 hours).</p>
          )}
        </div>
      </div>
    </div>
  );
}
