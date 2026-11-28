import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Plus,
  X,
  Activity
} from 'lucide-react';
import { Modal } from '../../../shared/components/Modal.js';
import { Button } from '../../../shared/components/Button.js';
import { Input } from '../../../shared/components/Input.js';
import { Badge } from '../../../shared/components/Badge.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { 
  useCreditorsOpsControllerCreateGlobal, 
  useCreditorsOpsControllerUpdateGlobal 
} from '../../../api/generated/debts/endpoints/ops-creditors/ops-creditors.js';
import { GlobalCreditorResponseDto } from '../../../api/generated/debts_models/index.js';
import { cn } from '../../../shared/utils/cn.js';

interface GlobalCreditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditor?: GlobalCreditorResponseDto | null;
}

export function GlobalCreditorModal({ isOpen, onClose, creditor }: GlobalCreditorModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!creditor;

  const [formData, setFormData] = useState({
    canonicalName: '',
    verifiedEIN: '',
    industry: '',
    isReferenceOnly: true,
    knownAliases: [] as string[],
  });
  const [newAlias, setNewAlias] = useState('');

  useEffect(() => {
    if (creditor) {
      setFormData({
        canonicalName: creditor.canonicalName,
        verifiedEIN: creditor.verifiedEIN || '',
        industry: creditor.industry || '',
        isReferenceOnly: creditor.isReferenceOnly,
        knownAliases: creditor.knownAliases || [],
      });
    } else {
      setFormData({
        canonicalName: '',
        verifiedEIN: '',
        industry: '',
        isReferenceOnly: true,
        knownAliases: [],
      });
    }
  }, [creditor, isOpen]);

  const createMutation = useCreditorsOpsControllerCreateGlobal({
    mutation: {
      onSuccess: () => {
        toast.success('Master creditor added to Gold List');
        queryClient.invalidateQueries({ queryKey: [`/ops/debts/creditors/global`] });
        onClose();
      },
      onError: (error) => {
        toast.error('Failed to create master creditor', { description: getErrorMessage(error) });
      }
    }
  });

  const updateMutation = useCreditorsOpsControllerUpdateGlobal({
    mutation: {
      onSuccess: () => {
        toast.success('Master creditor record synchronized');
        queryClient.invalidateQueries({ queryKey: [`/ops/debts/creditors/global`] });
        onClose();
      },
      onError: (error) => {
        toast.error('Failed to update master creditor', { description: getErrorMessage(error) });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      verifiedEIN: formData.verifiedEIN || undefined,
      industry: formData.industry || undefined,
    };

    if (isEditing && creditor) {
      updateMutation.mutate({ id: creditor.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const addAlias = () => {
    if (newAlias.trim() && !formData.knownAliases.includes(newAlias.trim())) {
      setFormData({
        ...formData,
        knownAliases: [...formData.knownAliases, newAlias.trim()]
      });
      setNewAlias('');
    }
  };

  const removeAlias = (alias: string) => {
    setFormData({
      ...formData,
      knownAliases: formData.knownAliases.filter(a => a !== alias)
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Refine Master Creditor' : 'Enlist New Master Creditor'}
      description="Global reference data for multi-tenant debtor resolution."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Canonical Legal Name"
            placeholder="e.g. JPMorgan Chase & Co."
            value={formData.canonicalName}
            onChange={(e) => setFormData({ ...formData, canonicalName: e.target.value })}
            required
          />
          <Input
            label="Verified EIN / Tax ID"
            placeholder="XX-XXXXXXX"
            value={formData.verifiedEIN}
            onChange={(e) => setFormData({ ...formData, verifiedEIN: e.target.value })}
          />
          <Input
            label="Industry Classification"
            placeholder="e.g. Banking, Retail, Medical"
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
          />
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] ml-1">Mastery Tier</label>
            <div className="flex p-1 bg-[var(--color-muted)] rounded-lg gap-1 border border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isReferenceOnly: true })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-all text-[10px] font-black uppercase",
                  formData.isReferenceOnly ? "bg-[var(--color-card)] shadow-sm text-emerald-500 ring-1 ring-[var(--color-border)]" : "text-[var(--color-muted-foreground)] hover:text-foreground"
                )}
              >
                <ShieldCheck size={12} />
                Gold List
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isReferenceOnly: false })}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-all text-[10px] font-black uppercase",
                  !formData.isReferenceOnly ? "bg-[var(--color-card)] shadow-sm text-blue-500 ring-1 ring-[var(--color-border)]" : "text-[var(--color-muted-foreground)] hover:text-foreground"
                )}
              >
                <Activity size={12} />
                Learned
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] ml-1">Known Identity Aliases</label>
          <div className="flex gap-2">
            <Input
              placeholder="Add alias (e.g. Chase Bank, JPMC)"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAlias())}
            />
            <Button type="button" variant="outline" size="sm" onClick={addAlias} icon={Plus}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/10 min-h-[60px]">
            {formData.knownAliases.length === 0 && (
              <span className="text-[10px] text-[var(--color-muted-foreground)] italic p-2">No aliases defined.</span>
            )}
            {formData.knownAliases.map(alias => (
              <Badge 
                key={alias} 
                variant="outline" 
                className="pl-2 pr-1 py-1 gap-1 border-indigo-500/20 bg-indigo-500/5 text-indigo-600 font-bold"
              >
                {alias}
                <button 
                  type="button" 
                  onClick={() => removeAlias(alias)}
                  className="p-0.5 rounded-full hover:bg-indigo-500/10 transition-colors"
                >
                  <X size={10} />
                </button>
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Discard
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={createMutation.isPending || updateMutation.isPending}
          >
            {isEditing ? 'Commit Synchronization' : 'Finalize Enlistment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
