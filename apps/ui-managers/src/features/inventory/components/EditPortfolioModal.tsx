import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, AlertCircle } from 'lucide-react';
import { usePortfoliosControllerUpdate } from '@/api/generated/debts/endpoints/portfolios/portfolios';
import { type PortfolioResponseDto } from '@/api/generated/debts_models';
import { useUser } from '@/shared/store/userStore';
import { useToast } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';

interface EditPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: PortfolioResponseDto;
}

export const EditPortfolioModal: React.FC<EditPortfolioModalProps> = ({ isOpen, onClose, portfolio }) => {
  const { organizationId } = useUser();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: updatePortfolio, isPending } = usePortfoliosControllerUpdate();

  const [formData, setFormData] = useState({
    name: '',
    purchasePrice: '',
    purchaseDate: '',
    source: ''
  });

  useEffect(() => {
    if (portfolio) {
      setFormData({
        name: portfolio.name,
        purchasePrice: portfolio.purchasePrice || '0',
        purchaseDate: portfolio.purchaseDate ? new Date(portfolio.purchaseDate).toISOString().split('T')[0] : '',
        source: portfolio.source || ''
      });
    }
  }, [portfolio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePortfolio({
        organizationId: organizationId!,
        id: portfolio.id,
        data: {
          name: formData.name,
          purchasePrice: parseFloat(formData.purchasePrice),
          purchaseDate: new Date(formData.purchaseDate).toISOString(),
          source: formData.source
        }
      });
      
      success('Portfolio Updated', 'Portfolio details have been saved.');
      queryClient.invalidateQueries({ queryKey: ['/organizations', organizationId, 'portfolios'] });
      onClose();
    } catch (err: any) {
      toastError('Update Failed', err.message || 'Could not update portfolio.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">Edit Portfolio</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Portfolio Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Purchase Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                  className="w-full rounded-md border border-border bg-background pl-7 pr-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Purchase Date</label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">Source / Origin</label>
            <input
              type="text"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
