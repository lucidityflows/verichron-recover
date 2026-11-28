import { useEffect, useState } from 'react';
import { cn } from '../../../shared/utils/cn';
import { TrendingUp, ShieldCheck } from 'lucide-react';

interface WellnessHeroProps {
  score: number;
  userName: string;
  totalResolvedPercent: number;
}

export function WellnessHero({ userName, totalResolvedPercent }: WellnessHeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-50 via-white to-emerald-50 border border-indigo-100/50 shadow-xl shadow-indigo-100/20">
      {/* Background Breathing Animation */}
      <div 
        className={cn(
          "absolute inset-0 bg-gradient-to-tr from-blue-100/30 to-purple-100/30 transition-opacity duration-[4000ms] ease-in-out opacity-0",
          mounted ? "opacity-100 animate-pulse-slow" : ""
        )} 
      />
      
      {/* Decorative Orbs */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-100/40 rounded-full blur-3xl animate-float-delayed" />

      <div className="relative z-10 p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Left Column: Text & Context */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 backdrop-blur-sm border border-white/50 text-indigo-600 text-xs font-bold uppercase tracking-wider shadow-sm">
              <ShieldCheck className="w-3 h-3" />
              Financial Wellness
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Good afternoon, {userName}.
            </h1>
            <p className="text-slate-500 text-lg leading-relaxed max-w-md">
              You're making steady progress. Breathing easier starts with small steps.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Current Streak</span>
              <span className="text-2xl font-bold text-slate-700 flex items-center gap-2">
                3 Months <span className="text-emerald-500 text-sm bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
              </span>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">Next Milestone</span>
              <span className="text-2xl font-bold text-slate-700">Jan 15</span>
            </div>
          </div>
        </div>

        {/* Right Column: The "Breath" Visualization */}
        <div className="flex justify-center md:justify-end">
          <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center">
            {/* Outer Breathing Ring */}
            <div className="absolute inset-0 bg-indigo-50 rounded-full animate-breath" />
            <div className="absolute inset-4 bg-white rounded-full shadow-inner flex items-center justify-center">
              {/* Progress Ring SVG */}
              <svg className="w-full h-full transform -rotate-90 p-2">
                <circle
                  cx="50%"
                  cy="50%"
                  r="42%"
                  className="stroke-slate-100 fill-none stroke-[8]"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="42%"
                  className="stroke-indigo-500 fill-none stroke-[8] transition-all duration-1000 ease-out"
                  strokeDasharray="264"
                  strokeDashoffset={264 * (1 - totalResolvedPercent / 100)}
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Inner Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-bold text-slate-800">{totalResolvedPercent}%</span>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Resolved</span>
              </div>
            </div>
            
            {/* Floating Badge */}
            <div className="absolute -bottom-2 bg-white rounded-xl shadow-lg border border-slate-100 px-4 py-2 flex items-center gap-2 animate-bounce-subtle">
              <div className="bg-emerald-100 p-1 rounded-full">
                <TrendingUp className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-slate-600">Top 10% Starter</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* CSS Styles for animations (Inline for prototype speed) */}
      <style>{`
        @keyframes breath {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 0.4; }
        }
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-20px, 20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -20px); }
        }
        .animate-breath {
          animation: breath 6s ease-in-out infinite;
        }
        .animate-float-slow {
          animation: float-slow 15s ease-in-out infinite;
        }
        .animate-float-delayed {
          animation: float-delayed 18s ease-in-out infinite;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 3s infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
