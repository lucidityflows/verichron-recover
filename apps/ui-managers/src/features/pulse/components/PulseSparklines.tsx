import React from 'react';
import { Activity, TrendingDown, TrendingUp, DollarSign, Phone, FileSignature } from 'lucide-react';

interface PulseMetric {
  value: number;
  trend: number;
}

interface PulseSparklinesProps {
  metrics?: {
    collections: PulseMetric;
    contacts: PulseMetric;
    promises: PulseMetric;
  };
  isLoading?: boolean;
}

/**
 * PulseSparklines
 * Micro-charts for tracking rapid operational shifts.
 */
export const PulseSparklines: React.FC<PulseSparklinesProps> = ({ 
  metrics = {
    collections: { value: 0, trend: 0 },
    contacts: { value: 0, trend: 0 },
    promises: { value: 0, trend: 0 }
  },
  isLoading = false
}) => {

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-md h-[300px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading pulse metrics...</div>
      </div>
    );
  }

  const renderTrend = (trend: number) => {
    const isPositive = trend >= 0;
    return (
      <span className={`flex items-center text-[10px] font-bold ${isPositive ? 'text-success' : 'text-error'}`}>
        {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
        <span className="ml-1">{isPositive ? '+' : ''}{trend}%</span>
      </span>
    );
  };

  // Mock data for sparklines until we have intraday endpoints
  const mockSparklineData = {
    promises: [3, 5, 4, 8, 6, 9, 7, 12, 10, 14, 12, 15],
    contacts: [40, 35, 45, 50, 48, 55, 60, 58, 65, 62, 70, 75],
    collections: [20, 25, 22, 30, 28, 35, 32, 40, 38, 45, 42, 50]
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">System Pulse (24h)</h3>
        <Activity size={18} className="text-muted-foreground" />
      </div>

      <div className="space-y-8">
        {/* Metric 1: Daily Promises */}
        <div className="flex items-center gap-6">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <FileSignature size={12} />
              Promises Secured
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-foreground">{metrics.promises.value}</span>
              {renderTrend(metrics.promises.trend)}
            </div>
          </div>
          <div className="flex gap-1 h-10 items-end w-32">
            {mockSparklineData.promises.map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/20 rounded-t-[1px]"
                style={{ height: `${(h / 15) * 100}%` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Metric 2: Daily Contacts */}
        <div className="flex items-center gap-6">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Phone size={12} />
              Daily Outreach
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-foreground">{metrics.contacts.value}</span>
              {renderTrend(metrics.contacts.trend)}
            </div>
          </div>
          <div className="flex gap-1 h-10 items-end w-32">
            {mockSparklineData.contacts.map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-success/20 rounded-t-[1px]"
                style={{ height: `${(h / 80) * 100}%` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Metric 3: Daily Collections */}
        <div className="flex items-center gap-6">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <DollarSign size={12} />
              Daily Collections
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-foreground">
                ${metrics.collections.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
              {renderTrend(metrics.collections.trend)}
            </div>
          </div>
          <div className="flex gap-1 h-10 items-end w-32">
            {mockSparklineData.collections.map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-indigo-500/20 rounded-t-[1px]"
                style={{ height: `${(h / 55) * 100}%` }}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
