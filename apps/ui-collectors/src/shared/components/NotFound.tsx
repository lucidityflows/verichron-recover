import React from 'react';
import { Link } from '@tanstack/react-router';
import { Home, Search, ChevronLeft } from 'lucide-react';

/**
 * Custom 404 / Not Found component for the Verichron Command Center.
 * Follows the "Quiet Power" ERP design standard.
 */
export const NotFound: React.FC = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4 animate-fade-in">
      <div className="rounded-full bg-slate-100 p-6 mb-6">
        <Search size={48} className="text-slate-400" />
      </div>
      
      <div className="space-y-2 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Resource Not Found</h1>
        <p className="text-sm font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
          The tactical domain or record you are looking for does not exist or has been moved within the Command Center hierarchy.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link 
          to="/"
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Home size={18} />
          Return to Control Tower
        </Link>
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 rounded-md bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-all"
        >
          <ChevronLeft size={18} />
          Back to Previous Domain
        </button>
      </div>

      <div className="mt-12 pt-8 border-t border-slate-100 w-full max-w-xs">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Log</div>
        <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase">Error Code: 404_DOMAIN_MISSING</p>
      </div>
    </div>
  );
};
