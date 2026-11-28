import { useState } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle2, CreditCard, Calendar, Target } from 'lucide-react';
import { SettlementSlider } from './SettlementSlider.js';

interface NegotiationWizardProps {
  debtId: string;
  creditor: string;
  balance: number;
  onClose: () => void;
}

type Step = 'choice' | 'configure' | 'review' | 'success';
type Path = 'full' | 'plan' | 'settle';

export function NegotiationWizard({ creditor, balance, onClose }: NegotiationWizardProps) {
  const [step, setStep] = useState<Step>('choice');
  const [path, setPath] = useState<Path | null>(null);
  const [offerAmount, setOfferAmount] = useState(balance);

  const handleChoice = (selectedPath: Path) => {
    setPath(selectedPath);
    if (selectedPath === 'full') {
      setOfferAmount(balance);
      setStep('review');
    } else {
      setStep('configure');
    }
  };

  const renderChoice = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose your path to freedom.</h2>
        <p className="text-muted-foreground">Select the resolution option that fits your current situation.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button 
          onClick={() => handleChoice('full')}
          className="flex items-center gap-4 p-5 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
        >
          <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <CreditCard className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold">Pay in Full</h4>
            <p className="text-sm text-muted-foreground">Resolve this account today and receive an immediate completion certificate.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <button 
          onClick={() => handleChoice('plan')}
          className="flex items-center gap-4 p-5 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
        >
          <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold">Monthly Resolution Path</h4>
            <p className="text-sm text-muted-foreground">Break the balance into small, manageable monthly payments.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>

        <button 
          onClick={() => handleChoice('settle')}
          className="flex items-center gap-4 p-5 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
        >
          <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <Target className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold">Propose a Settlement</h4>
            <p className="text-sm text-muted-foreground">Offer a one-time reduced amount to close this account permanently.</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>
    </div>
  );

  const renderConfigure = () => (
    <div className="space-y-8 animate-fade-in">
      <div className="space-y-2">
        <button onClick={() => setStep('choice')} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to options
        </button>
        <h2 className="text-2xl font-bold">
          {path === 'settle' ? 'Customize your settlement.' : 'Design your payment plan.'}
        </h2>
      </div>

      {path === 'settle' ? (
        <SettlementSlider 
          balance={balance} 
          minAllowedPercent={65} 
          onOfferChange={setOfferAmount} 
        />
      ) : (
        <div className="p-8 bg-muted/20 border border-dashed border-border rounded-2xl text-center">
          <p className="text-muted-foreground">Payment plan builder UI coming soon...</p>
        </div>
      )}

      <button 
        onClick={() => setStep('review')}
        className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
      >
        Review My Resolution <ArrowRight className="h-5 w-5" />
      </button>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-8 animate-fade-in">
       <div className="space-y-2">
        <button onClick={() => setStep(path === 'full' ? 'choice' : 'configure')} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to settings
        </button>
        <h2 className="text-2xl font-bold">One last check.</h2>
        <p className="text-muted-foreground">Please review the details of your resolution path.</p>
      </div>

      <div className="bg-muted/30 rounded-3xl p-6 space-y-4">
        <div className="flex justify-between pb-4 border-b border-border/50">
          <span className="text-muted-foreground font-medium">Creditor</span>
          <span className="font-bold">{creditor}</span>
        </div>
        <div className="flex justify-between pb-4 border-b border-border/50">
          <span className="text-muted-foreground font-medium">Type</span>
          <span className="font-bold">{path === 'full' ? 'Full Payment' : path === 'settle' ? 'Settlement' : 'Payment Plan'}</span>
        </div>
        <div className="flex justify-between pt-2">
          <span className="text-lg font-bold">Total Amount</span>
          <span className="text-2xl font-bold text-primary">${offerAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-xs text-muted-foreground text-center px-6">
          By clicking "Confirm Resolution", you agree to the terms and conditions. Your account will be updated immediately upon successful processing.
        </p>
        <button 
          onClick={() => setStep('success')}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
        >
          Confirm My Resolution
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-8 py-8 animate-fade-in">
      <div className="relative inline-block">
        <div className="h-24 w-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto relative z-10">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <div className="absolute inset-0 bg-emerald-400/20 rounded-full blur-2xl animate-pulse" />
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold">You did it!</h2>
        <p className="text-muted-foreground text-lg max-w-xs mx-auto">
          Your resolution path has been secured. You're one step closer to financial freedom.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 pt-4">
        <button className="py-3 px-6 rounded-xl border border-border font-bold hover:bg-muted transition-colors">
          Download Confirmation PDF
        </button>
        <button 
          onClick={onClose}
          className="py-3 px-6 bg-foreground text-background rounded-xl font-bold hover:opacity-90 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-xl bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden animate-zoom-in">
        <div className="absolute top-6 right-6 z-20">
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 sm:p-12">
          {step === 'choice' && renderChoice()}
          {step === 'configure' && renderConfigure()}
          {step === 'review' && renderReview()}
          {step === 'success' && renderSuccess()}
        </div>
      </div>
    </div>
  );
}
