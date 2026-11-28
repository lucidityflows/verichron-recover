import React, { useState, useRef, useMemo } from 'react';
import { Sparkles, Check, AlertCircle, Info } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/shared/utils/cn';

interface RepairRow {
  id: string;
  sourceRow: number;
  data: Record<string, string>;
  errors: {
    field: string;
    type: 'SYNTAX' | 'BUSINESS' | 'SEMANTIC';
    message: string;
    suggestion?: string;
    confidence?: number;
  }[];
}

/**
 * RepairShopGrid
 * Implements @tanstack/react-virtual for high-density, 50k+ row performance.
 * Features: "Green Strip" bulk-AI, virtualized repair list, inline editing.
 */
export const RepairShopGrid: React.FC = () => {
  const [activeCell, setActiveCell] = useState<{ rowId: string, field: string } | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  // 1. DATA MOCKING (Including high-volume virtualization test)
  const verifiedItems: RepairRow[] = useMemo(() => [
    {
      id: 'v_1',
      sourceRow: 14,
      data: { account: 'AC-10293', creditor: 'JPM C Chase', balance: '5240.00' },
      errors: [{ 
        field: 'creditor', 
        type: 'SEMANTIC', 
        message: 'Master Match Found', 
        suggestion: 'JPMorgan Chase Bank, N.A.', 
        confidence: 0.98 
      }]
    }
  ], []);

  const repairItems: RepairRow[] = useMemo(() => {
    // Generate 1,000 mock rows to demonstrate virtualization smoothness
    return Array.from({ length: 1000 }).map((_, i) => ({
      id: `r_${i}`,
      sourceRow: i + 100,
      data: { 
        account: i % 10 === 0 ? 'INVALID' : `AC-${10000 + i}`, 
        creditor: 'Unknown Corp', 
        balance: i % 15 === 0 ? 'NaN' : `${(Math.random() * 5000).toFixed(2)}` 
      },
      errors: i % 10 === 0 ? [
        { field: 'account', type: 'SYNTAX', message: 'Must be numeric' }
      ] : i % 15 === 0 ? [
        { field: 'balance', type: 'SYNTAX', message: 'Invalid format' }
      ] : []
    }));
  }, []);

  // 2. VIRTUALIZER SETUP
  const rowVirtualizer = useVirtualizer({
    count: repairItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32, // High-density ERP height
    overscan: 10, // Buffer for smooth scrolling
  });

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
      {/* HEADER: GREEN STRIP (Static top) */}
      <div className="bg-emerald-50/50 border-b border-emerald-100 px-4 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-tight">AI Verified Suggestions</h4>
            <p className="text-[10px] font-medium text-emerald-700">Vertex AI matched {verifiedItems.length} records with &gt;95% confidence.</p>
          </div>
        </div>
        <button className="flex items-center gap-2 rounded bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95">
          <Check size={14} />
          ACCEPT ALL
        </button>
      </div>

      {/* THE VIRTUALIZED SPREADSHEET */}
      <div 
        ref={parentRef}
        className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50/30"
      >
        <div 
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Table Head (Sticky via CSS) */}
          <div className="sticky top-0 z-20 bg-white border-b border-slate-200 flex text-[10px] font-bold text-slate-400 uppercase tracking-tighter shadow-sm">
            <div className="w-12 px-3 py-2 shrink-0">Row</div>
            <div className="w-40 px-3 py-2 shrink-0 border-l border-slate-100">Account</div>
            <div className="w-64 px-3 py-2 shrink-0 border-l border-slate-100">Creditor</div>
            <div className="w-32 px-3 py-2 shrink-0 border-l border-slate-100">Balance</div>
            <div className="flex-1 px-3 py-2 border-l border-slate-100">Validation Logic</div>
          </div>

          {/* Virtualized Rows */}
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = repairItems[virtualRow.index];
            const isEven = virtualRow.index % 2 === 0;

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                className={cn(
                  "absolute top-0 left-0 w-full flex items-center border-b border-slate-100 font-mono text-[11px] group",
                  isEven ? "bg-white" : "bg-slate-50/50",
                  "hover:bg-indigo-50/30"
                )}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div className="w-12 px-3 py-1.5 shrink-0 text-slate-400">{row.sourceRow}</div>
                
                {['account', 'creditor', 'balance'].map((field) => {
                  const hasError = row.errors.find(e => e.field === field);
                  const isActive = activeCell?.rowId === row.id && activeCell?.field === field;
                  const fieldWidth = field === 'account' ? 'w-40' : field === 'creditor' ? 'w-64' : 'w-32';

                  return (
                    <div 
                      key={field}
                      onClick={() => setActiveCell({ rowId: row.id, field })}
                      className={cn(
                        fieldWidth, "px-3 py-1.5 shrink-0 border-l border-slate-100 cursor-text truncate",
                        hasError ? "bg-red-50 text-red-700 font-bold" : "text-slate-600",
                        isActive && "ring-2 ring-inset ring-indigo-500 bg-white z-10"
                      )}
                    >
                      {isActive ? (
                        <input 
                          autoFocus
                          defaultValue={(row.data as any)[field]}
                          className="w-full bg-transparent outline-none"
                          onBlur={() => setActiveCell(null)}
                        />
                      ) : (
                        (row.data as any)[field]
                      )}
                    </div>
                  );
                })}

                <div className="flex-1 px-3 py-1.5 border-l border-slate-100 flex gap-1 overflow-hidden">
                  {row.errors.length > 0 ? (
                    row.errors.map((err, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded uppercase whitespace-nowrap">
                        <AlertCircle size={8} /> {err.message}
                      </span>
                    ))
                  ) : (
                    <span className="text-emerald-500"><Check size={12} /></span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER: SYSTEM LOG */}
      <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between text-white">
        <div className="flex gap-6 items-center">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Health</span>
            <span className="text-xs font-bold text-emerald-400">92% Clean</span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 italic">
            <Info size={12} className="text-indigo-400" />
            * Virtualized Viewport Active (1,000+ Records)
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase">Discard</button>
          <button className="bg-indigo-600 px-6 py-1.5 rounded text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all">
            COMMIT DATA
          </button>
        </div>
      </div>
    </div>
  );
};