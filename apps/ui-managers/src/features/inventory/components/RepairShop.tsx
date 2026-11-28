import React from 'react';
import { Sparkles, Check, AlertTriangle, Save, Filter, Search } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

/**
 * RepairShop
 * Interactive grid for inline error correction.
 * Implements the Hybrid AI (Human-in-the-Loop) pattern.
 */
export const RepairShop: React.FC = () => {
  const badRows = [
    { 
      id: 1, 
      account: 'AC-10293', 
      creditor: 'JPM C Chase', 
      balance: '$5,240.00', 
      zip: '9021', 
      errors: [
        { field: 'creditor', type: 'AI_SUGGESTION', message: 'Match: JPMorgan Chase', confidence: 0.98 },
        { field: 'zip', type: 'SYNTAX', message: 'Invalid ZIP (Must be 5 digits)' }
      ]
    },
    { 
      id: 2, 
      account: 'AC-44921', 
      creditor: 'First Nat Bank', 
      balance: '$1,400,000.00', 
      zip: '60601', 
      errors: [
        { field: 'balance', type: 'ANOMALY', message: 'Outlier: 500% higher than portfolio avg', confidence: 0.72 }
      ]
    }
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden flex flex-col h-[600px]">
      {/* Grid Toolbar */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-tight">
            <AlertTriangle size={16} className="text-amber-500" />
            2 Rows Require Repair
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 transition-colors">
              <Sparkles size={12} />
              ACCEPT ALL AI FIXES (95%+)
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-slate-400 hover:text-slate-600"><Search size={16} /></button>
          <button className="p-1.5 text-slate-400 hover:text-slate-600"><Filter size={16} /></button>
        </div>
      </div>

      {/* High-Density Spread-grid */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse table-fixed">
          <thead className="sticky top-0 z-10">
            <tr className="bg-white border-b border-slate-200">
              <th className="w-12 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">#</th>
              <th className="w-32 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Account</th>
              <th className="w-64 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Creditor (Semantic)</th>
              <th className="w-40 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Balance</th>
              <th className="w-24 px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Zip</th>
              <th className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase">Issues Found</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
            {badRows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-300">{row.id}</td>
                <td className="px-4 py-3 font-bold text-slate-900">{row.account}</td>
                
                {/* Semantic Cell with AI Hint */}
                <td className="px-4 py-3 relative group">
                  <div className="flex items-center justify-between border-b border-dashed border-indigo-300 pb-0.5">
                    <span className="text-slate-900">{row.creditor}</span>
                    <Sparkles size={12} className="text-indigo-500 animate-pulse" />
                  </div>
                  {/* Suggestion Popover (Visual Proxy) */}
                  <div className="absolute left-4 top-full z-20 mt-1 hidden group-hover:block w-64 rounded-lg bg-slate-900 p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase">Vertex AI Suggestion</span>
                        <span className="text-[9px] font-bold text-emerald-400">98% CONFIDENT</span>
                      </div>
                      <p className="text-xs text-white">Map to Master Creditor: <span className="font-bold text-indigo-300">JPMorgan Chase</span></p>
                      <div className="flex gap-2 pt-1">
                        <button className="flex-1 rounded bg-indigo-600 py-1 text-[10px] font-bold text-white hover:bg-indigo-700">ACCEPT</button>
                        <button className="flex-1 rounded bg-white/10 py-1 text-[10px] font-bold text-white hover:bg-white/20">IGNORE</button>
                      </div>
                    </div>
                  </div>
                </td>

                <td className={cn(
                  "px-4 py-3",
                  row.errors.some(e => e.field === 'balance') && "bg-amber-50 text-amber-700 font-bold"
                )}>
                  {row.balance}
                </td>

                <td className={cn(
                  "px-4 py-3",
                  row.errors.some(e => e.field === 'zip') && "bg-red-50 text-red-700 font-bold"
                )}>
                  {row.zip}
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.errors.map((error, idx) => (
                      <span key={idx} className={cn(
                        "px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold uppercase",
                        error.type === 'SYNTAX' ? "bg-red-100 text-red-700" :
                        error.type === 'ANOMALY' ? "bg-amber-100 text-amber-700" :
                        "bg-indigo-100 text-indigo-700"
                      )}>
                        {error.message}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
        <p className="text-[10px] text-slate-500 italic uppercase font-bold tracking-tighter">
          * Tier 3 Validation Active: Vertex AI is scanning for outliers and duplicates.
        </p>
        <div className="flex gap-3">
          <button className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors uppercase">Discard Import</button>
          <button className="flex items-center gap-2 rounded-md bg-slate-900 px-6 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all">
            <Save size={14} />
            FINALIZE & COMMIT
          </button>
        </div>
      </div>
    </div>
  );
};
