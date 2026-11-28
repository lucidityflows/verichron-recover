import React, { useState } from 'react';
import { Star, AlertCircle, Clock, ClipboardCheck, Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { 
  useCollectorNoteControllerCreateNote, 
  getCollectorNoteControllerSearchNotesQueryKey 
} from '@/api/generated/collectors/endpoints/collector-notes/collector-notes';
import { NoteType } from '@/api/generated/collectors_models';
import { useUser } from '@/shared/store/userStore';
import { useToast } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';

interface CoachingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  leadName: string;
  leadId: string;
  type: 'PRAISE' | 'SUPPORT';
}

export const CoachingDrawer: React.FC<CoachingDrawerProps> = ({ isOpen, onClose, leadName, leadId, type }) => {
  const { organizationId } = useUser();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: createNote, isPending } = useCollectorNoteControllerCreateNote();

  const [template, setTemplate] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async () => {
    if (!note) return;

    try {
      await createNote({
        organizationId: organizationId!,
        data: {
          type: NoteType.COACHING,
          targetUserId: leadId,
          title: `${type === 'PRAISE' ? 'Encouragement' : 'Strategic Support'}: ${template || 'Custom'}`,
          content: note,
          metadata: {
            subType: type,
            template
          }
        }
      });
      
      // Invalidate the search query to refresh the logs
      queryClient.invalidateQueries({ 
        queryKey: getCollectorNoteControllerSearchNotesQueryKey(organizationId!) 
      });

      success('Session Logged', 'Coaching note has been saved to the leadership trail.');
      onClose();
    } catch (err: any) {
      toastError('Failed to Log', err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex justify-end bg-sidebar/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full">
        <div className="p-6 border-b border-border bg-muted flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center text-white",
              type === 'PRAISE' ? "bg-success" : "bg-warning"
            )}>
              {type === 'PRAISE' ? <Star size={24} /> : <AlertCircle size={24} />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Send {type === 'PRAISE' ? 'Praise' : 'Coaching'}</h3>
              <p className="text-xs font-medium text-muted-foreground">To: {leadName} (Team Lead)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Clock size={20} className="text-muted-foreground" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-tight">Feedback Template</label>
            <select 
              className="w-full rounded-md border-border bg-card text-foreground text-sm focus:ring-ring"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            >
              <option value="">Select a template...</option>
              {type === 'PRAISE' ? (
                <>
                  <option>Goal Achievement (Daily)</option>
                  <option>Perfect Compliance Week</option>
                  <option>Top Recovery Performance</option>
                </>
              ) : (
                <>
                  <option>Projection Underperformance</option>
                  <option>High Rejected Settlement Rate</option>
                  <option>Compliance Near-Miss Correction</option>
                </>
              )}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-tight">Coaching Note</label>
            <textarea 
              rows={6} 
              className="w-full rounded-md border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:ring-ring" 
              placeholder="Add specific strategic advice..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="p-4 rounded-xl bg-muted border border-border flex items-start gap-3">
            <ClipboardCheck size={18} className="text-primary mt-0.5 flex-shrink-0" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-bold">Paper Trail:</span> This coaching session will require a mandatory acknowledgement from the Team Lead and will be logged to the organization's audit history.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-card">
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-2.5 text-sm font-bold text-foreground border border-border rounded-lg hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !note}
              className={cn(
                "flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white shadow-lg transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
                type === 'PRAISE' ? "bg-success hover:bg-success/90" : "bg-warning hover:bg-warning/90"
              )}
            >
              {isPending ? <Loader2 size={16} className="animate-spin" /> : 'SEND & LOG SESSION'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
