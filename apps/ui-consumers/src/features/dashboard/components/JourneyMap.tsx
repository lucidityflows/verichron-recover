import { ArrowRight, CheckCircle2, Lock, Clock, FileText } from 'lucide-react';
import { cn } from '../../../shared/utils/cn';

export interface JourneyStep {
  id: string;
  type: 'active' | 'future' | 'completed';
  title: string;
  subtitle: string;
  amount?: string;
  date?: string;
  creditor: string;
  onAction?: () => void;
  onSecondaryAction?: () => void;
  secondaryActionLabel?: string;
}

interface JourneyMapProps {
  steps: JourneyStep[];
}

export function JourneyMap({ steps }: JourneyMapProps) {
  return (
    <div className="relative space-y-8 pl-8 py-4">
      {/* Vertical Timeline Line */}
      <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-500 via-indigo-200 to-slate-100" />

      {steps.map((step) => (
        <div key={step.id} className="relative group">
          
          {/* Timeline Node */}
          <div className={cn(
            "absolute -left-[1.65rem] w-6 h-6 rounded-full border-4 flex items-center justify-center bg-white z-10 transition-colors duration-300",
            step.type === 'active' ? "border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]" : 
            step.type === 'completed' ? "border-emerald-500" : "border-slate-200"
          )}>
            {step.type === 'completed' && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
            {step.type === 'active' && <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse" />}
            {step.type === 'future' && <div className="w-2 h-2 bg-slate-300 rounded-full" />}
          </div>

          {/* Card Content */}
          <div 
            className={cn(
              "relative transition-all duration-300 ease-in-out",
              step.type === 'active' ? "transform scale-100 opacity-100" : 
              step.type === 'future' ? "transform scale-95 opacity-60 hover:opacity-100" :
              "opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
            )}
          >
            {step.type === 'active' ? (
              // ACTIVE CARD (Focus)
              <div className="bg-white rounded-2xl p-6 border border-indigo-100 shadow-xl shadow-indigo-100/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Clock className="w-24 h-24" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full mb-2 uppercase tracking-wide">
                        Current Focus
                      </span>
                      <h3 className="text-xl font-bold text-slate-800">{step.title}</h3>
                      <p className="text-slate-500 text-sm">{step.creditor}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-slate-900">${step.amount}</div>
                      <div className="text-xs text-slate-400 font-medium">Due {step.date}</div>
                    </div>
                  </div>

                  <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                    {step.subtitle}
                  </p>

                  <div className="flex gap-3">
                    <button 
                      onClick={step.onAction}
                      className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group-hover:gap-3"
                    >
                      Take Action <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                    
                    {step.onSecondaryAction && (
                      <button
                        onClick={step.onSecondaryAction}
                        className="px-4 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold border border-slate-200 transition-colors flex items-center justify-center"
                        title={step.secondaryActionLabel}
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : step.type === 'future' ? (
              // FUTURE CARD
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 border-dashed flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-700">{step.title}</h4>
                    <p className="text-sm text-slate-400">{step.subtitle}</p>
                  </div>
                </div>
                {step.amount && <span className="font-bold text-slate-400">${step.amount}</span>}
              </div>
            ) : (
              // COMPLETED CARD
              <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 flex items-center gap-4">
                <div className="p-1 bg-emerald-100 rounded-full text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-700 line-through decoration-emerald-500/30">{step.title}</h4>
                </div>
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Resolved</span>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {/* End of Journey Indicator */}
      <div className="relative pl-8 pt-4 pb-8 opacity-40">
        <div className="absolute left-3 top-0 w-0.5 h-full bg-gradient-to-b from-slate-100 to-transparent" />
        <p className="text-sm text-slate-400 italic">More milestones will appear as you progress...</p>
      </div>
    </div>
  );
}
