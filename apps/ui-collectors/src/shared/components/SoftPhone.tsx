import React, { useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, ChevronUp, ChevronDown, Signal } from 'lucide-react';
import { useSoftPhone } from '../hooks/useSoftPhone';
import { cn } from '../utils/cn';

/**
 * SoftPhone HUD
 * Persistent telephony interface for collectors.
 */
export const SoftPhone: React.FC = () => {
  const { 
    isInitialized, 
    callStatus, 
    isMuted, 
    disconnectCall, 
    toggleMute,
    refreshDevice
  } = useSoftPhone();
  
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive = callStatus !== 'IDLE';

  return (
    <div className={cn(
      "fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out",
      isExpanded ? "w-80" : "w-64"
    )}>
      <div className={cn(
        "bg-slate-900 border rounded-2xl shadow-2xl overflow-hidden transition-all duration-500",
        !isInitialized ? "border-red-500/50 shadow-red-900/20" : 
        isActive ? "border-emerald-500 ring-2 ring-emerald-500 animate-pulse-slow" : "border-slate-700"
      )}>
        {/* Header / Status Bar */}
        <div 
          className={cn(
            "px-4 py-3 flex items-center justify-between cursor-pointer transition-colors",
            !isInitialized ? "bg-red-950/30 hover:bg-red-950/50" : "hover:bg-slate-800"
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-2 w-2 rounded-full",
              !isInitialized ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" :
              isActive ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-emerald-500/50"
            )} />
            <span className={cn(
              "text-xs font-bold uppercase tracking-widest",
              !isInitialized ? "text-red-400" : 
              isActive ? "text-emerald-400" : "text-emerald-500/70"
            )}>
              {!isInitialized ? 'Phone Error' : isActive ? callStatus : 'Ready to Call'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Signal size={14} className={cn(!isInitialized ? "text-red-900" : "text-slate-500")} />
            {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-xl">
            {!isInitialized ? (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                  <PhoneOff size={24} className="text-red-500" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Telephony Disconnected</div>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Twilio SDK failed to initialize. Check your credentials.</p>
                  <button 
                    onClick={(e) => { e.stopPropagation(); void refreshDevice(); }}
                    className="text-xs font-bold text-red-400 hover:text-red-300 underline underline-offset-4"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            ) : isActive ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-sm text-slate-400 mb-1">Active Call</div>
                  <div className="text-xl font-bold text-white font-mono">00:42</div>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={toggleMute}
                    className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center transition-all",
                      isMuted ? "bg-red-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    )}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  <button
                    onClick={disconnectCall}
                    className="h-12 w-12 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-all hover:scale-110 shadow-lg shadow-red-900/20"
                  >
                    <PhoneOff size={20} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-emerald-500/10">
                  <Phone size={24} className="text-emerald-500/50" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">System Ready</div>
                  <p className="text-xs text-slate-500 mt-1">Select a debtor from your queue to begin.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
