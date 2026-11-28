/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-redundant-type-constituents */
import { useState } from 'react';
import { CheckCircle2, TrendingUp, ShieldCheck, Wallet } from 'lucide-react';
import { NegotiationWizard } from '../negotiation/components/NegotiationWizard.js';
import { ValidationVault } from '../debts/components/ValidationVault.js';
import { WellnessHero } from './components/WellnessHero.js';
import { JourneyMap, type JourneyStep } from './components/JourneyMap.js';

export function DashboardPage() {
  const [negotiatingDebt, setNegotiatingDebt] = useState<any | null>(null);
  const [verifyingDebt, setVerifyingDebt] = useState<any | null>(null);

  // Transformed Mock Data for Journey Map
  // In a real app, this would be derived from the API response
  const journeySteps: JourneyStep[] = [
    {
      id: '1',
      type: 'active',
      title: 'Monthly Payment',
      subtitle: 'Keeping this streak alive will improve your credit standing by an estimated 5 points.',
      amount: '50.00',
      date: 'Jan 15',
      creditor: 'General Hospital',
      onAction: () => setNegotiatingDebt({ 
        id: '1', 
        creditor: 'General Hospital', 
        currentBalance: 450 
      }),
      secondaryActionLabel: 'Verify Debt',
      onSecondaryAction: () => setVerifyingDebt({
        id: '1',
        creditor: 'General Hospital',
        currentBalance: 450
      })
    },
    {
      id: '2',
      type: 'future',
      title: 'Settlement Offer',
      subtitle: 'Acme Collections is reviewing your proposal.',
      amount: '100.00',
      creditor: 'Acme Collections'
    },
    {
      id: '3',
      type: 'completed',
      title: 'Resolved Account',
      subtitle: 'Paid in full on Dec 12, 2025',
      creditor: 'Triton Financial'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
      {/* Negotiation Modal */}
      {negotiatingDebt && (
        <NegotiationWizard 
          debtId={negotiatingDebt.id}
          creditor={negotiatingDebt.creditor}
          balance={negotiatingDebt.currentBalance}
          onClose={() => setNegotiatingDebt(null)}
        />
      )}

      {/* Validation Vault Modal */}
      {verifyingDebt && (
        <ValidationVault 
          debtId={verifyingDebt.id}
          creditor={verifyingDebt.creditor}
          onClose={() => setVerifyingDebt(null)}
        />
      )}

      {/* Hero Section */}
      <WellnessHero 
        score={72} 
        userName="Alex" 
        totalResolvedPercent={28} 
      />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: The Journey (Timeline) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-slate-800">Your Path to Freedom</h2>
          </div>
          
          <JourneyMap steps={journeySteps} />
        </div>

        {/* Right Column: Trust & Resources */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg shadow-slate-100/50 sticky top-6">
            <h3 className="font-bold text-slate-800 mb-4">Why Verichron?</h3>
            
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-700">Bank-Level Security</h4>
                  <p className="text-xs text-slate-500 mt-1">Your data is encrypted with 256-bit SSL protection.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-700">FDCPA Compliant</h4>
                  <p className="text-xs text-slate-500 mt-1">We strictly adhere to all federal consumer protection laws.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-700">Credit Building</h4>
                  <p className="text-xs text-slate-500 mt-1">Consistent payments can help improve your credit score over time.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <button className="w-full py-2 text-sm font-medium text-slate-400 hover:text-indigo-600 transition-colors">
                View Legal Disclosures
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}