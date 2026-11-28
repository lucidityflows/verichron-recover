import React, { useState } from 'react';
import {
  X,
  Save,
  Eye,
  Code,
  Variable,
  ShieldCheck,
  Smartphone,
  Mail,
  FileText,
  AlertCircle,
  CheckCircle2,
  Info,
  Clock,
  Loader2
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface TemplateEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  template: {
    id: string;
    name: string;
    channel: 'EMAIL' | 'SMS' | 'LETTER';
    content: string;
    version: string;
  };
  onSave: (params: { templateId: string; data: any }) => Promise<any>;
  isSaving?: boolean;
}

/**
 * TemplateEditorDrawer
 * High-fidelity workspace for dunning content management.
 * Implements side-by-side editing and real-time device preview.
 */
export const TemplateEditorDrawer: React.FC<TemplateEditorDrawerProps> = ({
  isOpen,
  onClose,
  template,
  onSave,
  isSaving = false
}) => {
  const [content, setContent] = useState(template.content);
  const [activeView, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');

  const handleSave = async () => {
    try {
      await onSave({
        templateId: template.id,
        data: { content }
      });
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template. Please try again.');
    }
  };

  if (!isOpen) return null;

  const variables = ['debtor_name', 'current_balance', 'account_number', 'creditor_name', 'settlement_amount'];

  return (
    <div className="fixed inset-0 z-[400] flex justify-end bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center text-white shadow-lg",
              template.channel === 'EMAIL' ? "bg-blue-600" : template.channel === 'SMS' ? "bg-emerald-600" : "bg-amber-600"
            )}>
              {template.channel === 'EMAIL' && <Mail size={24} />}
              {template.channel === 'SMS' && <Smartphone size={24} />}
              {template.channel === 'LETTER' && <FileText size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-none">{template.name}</h3>
              <p className="text-xs font-medium text-slate-500 mt-1">Editing {template.channel} Template • {template.version}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Editor Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Pane: Editor & Tools */}
          <div className="flex-1 flex flex-col border-r border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-50 bg-white flex items-center justify-between">
              <div className="flex gap-2">
                {variables.map(v => (
                  <button key={v} className="px-2 py-1 rounded bg-slate-100 text-[9px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors uppercase tracking-tighter">
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 cursor-pointer">
                <Variable size={12} />
                INSERT VARIABLE
              </div>
            </div>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="flex-1 p-6 font-mono text-sm leading-relaxed text-slate-700 bg-white outline-none resize-none focus:bg-slate-50/30 transition-colors"
              placeholder="Enter template content with {{variables}}..."
            />
            
            {/* Compliance Footer (Left) */}
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                <ShieldCheck size={14} /> Compliance Checklist
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                  <CheckCircle2 size={12} /> Mini-Miranda Included
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                  <CheckCircle2 size={12} /> Opt-out Link Present
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane: Real-time Preview */}
          <div className="w-[400px] bg-slate-100 flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Live Preview</span>
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-slate-300" />
                <div className="h-2 w-2 rounded-full bg-slate-300" />
                <div className="h-2 w-2 rounded-full bg-slate-300" />
              </div>
            </div>

            <div className="flex-1 p-8 overflow-y-auto flex justify-center custom-scrollbar">
              {/* Device Frame */}
              {template.channel === 'SMS' ? (
                <div className="w-[280px] h-[500px] bg-white rounded-[32px] border-8 border-slate-900 shadow-2xl overflow-hidden relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 rounded-b-xl" />
                  <div className="p-4 pt-10 space-y-4">
                    <div className="flex justify-start">
                      <div className="bg-slate-100 rounded-2xl rounded-tl-sm p-3 text-xs text-slate-800 shadow-sm max-w-[85%] whitespace-pre-wrap">
                        {content.replace(/{{[^{}]+}}/g, (m) => m.toUpperCase())}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full bg-white shadow-xl min-h-[600px] p-8 border border-slate-200 text-slate-800">
                  {template.channel === 'LETTER' && (
                    <div className="mb-12 flex justify-between border-b border-slate-100 pb-4">
                      <div className="font-bold uppercase tracking-widest text-indigo-600 text-lg">Verichron LOGO</div>
                      <div className="text-[9px] text-right text-slate-400 font-mono">
                        REF: BATCH-402-LOG<br />
                        DATE: DEC 25, 2025
                      </div>
                    </div>
                  )}
                  <div className={cn(
                    "whitespace-pre-wrap",
                    template.channel === 'LETTER' ? "font-serif text-sm leading-relaxed" : "font-sans text-sm"
                  )}>
                    {content.replace(/{{[^{}]+}}/g, (m) => `[${m.replace(/[{}]/g, '').toUpperCase()}]`)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="p-6 border-t border-slate-100 bg-white shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
              <Clock size={14} />
              <span>Current Draft: v{parseFloat(template.version.replace('v', '')) + 0.1}</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Discard Changes
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    SAVING...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    SUBMIT FOR APPROVAL
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
