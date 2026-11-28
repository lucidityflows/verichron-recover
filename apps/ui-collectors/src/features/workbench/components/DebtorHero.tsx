import React from 'react';
import { User, Phone, Mail, AlertCircle, Clock, MapPin } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

import { type DebtorFocusDebtorDto } from '@/api/generated/collectors_models';

import { useSoftPhone } from '@/shared/hooks/useSoftPhone';

interface DebtorHeroProps {
  debtor: DebtorFocusDebtorDto;
  totalBalance?: number;
  daysOverdue?: number;
  lastContactDate?: string | null;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * DebtorHero
 * Large hero section displaying key debtor information
 */
export const DebtorHero: React.FC<DebtorHeroProps> = ({ 
  debtor, 
  totalBalance = 0,
  daysOverdue = 0,
  lastContactDate,
  riskLevel = 'MEDIUM' 
}) => {
  const { makeCall, callStatus } = useSoftPhone();
  
  const riskConfig = {
    LOW: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
      icon: 'text-emerald-400',
    },
    MEDIUM: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
    },
    HIGH: {
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/30',
      icon: 'text-red-400',
    },
  }[riskLevel];

  const handleCall = () => {
    if (debtor.phone?.phoneNumber) {
      void makeCall(debtor.phone.phoneNumber);
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Row: Name + Risk Badge */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="h-16 w-16 rounded-full bg-sky-500/10 flex items-center justify-center border-2 border-sky-500/20">
              <User size={32} className="text-sky-400" />
            </div>

            {/* Name */}
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">
                {debtor.firstName} {debtor.lastName}
              </h1>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                {debtor.phone?.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Phone size={14} />
                      {debtor.phone.phoneNumber}
                    </span>
                    <button
                      onClick={handleCall}
                      disabled={callStatus !== 'IDLE'}
                      className={cn(
                        "ml-2 px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                        callStatus === 'IDLE'
                          ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed"
                      )}
                    >
                      <Phone size={12} fill="currentColor" />
                      {callStatus === 'IDLE' ? 'Call' : 'On Call'}
                    </button>
                  </div>
                )}
                {debtor.email?.email && (
                  <>
                    <span className="text-slate-600">•</span>
                    <a
                      href={`mailto:${debtor.email.email}`}
                      className="flex items-center gap-1.5 hover:text-sky-400 transition-colors font-medium"
                    >
                      <Mail size={14} />
                      {debtor.email.email}
                    </a>
                  </>
                )}
                {debtor.address?.city && debtor.address?.state && (
                  <>
                    <span className="text-slate-600">•</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={14} />
                      {debtor.address.city}, {debtor.address.state}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Risk Badge */}
          <div
            className={cn(
              'px-4 py-2 rounded-lg border-2 font-bold uppercase text-sm',
              riskConfig.bg,
              riskConfig.text,
              riskConfig.border
            )}
          >
            {riskLevel} Risk
          </div>
        </div>

        {/* Bottom Row: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Balance */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              Total Balance
            </div>
            <div className="text-3xl font-mono font-bold text-white">
              ${totalBalance.toLocaleString()}
            </div>
          </div>

          {/* Days Overdue */}
          <div className="bg-slate-800 rounded-xl border border-red-500/30 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-red-400 mb-2 flex items-center gap-1.5">
              <AlertCircle size={14} />
              Days Overdue
            </div>
            <div className="text-3xl font-mono font-bold text-red-400">
              {daysOverdue}
            </div>
          </div>

          {/* Last Contact */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              Last Contact
            </div>
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-slate-500" />
              <span className="text-lg font-medium text-white">
                {lastContactDate
                  ? new Date(lastContactDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
