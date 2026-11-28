import React, { useState } from 'react';
import { 
  ChevronRight, 
  ClipboardCheck,
  Loader2
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useUser } from '../../shared/store/userStore.js';
import { useTeamsControllerGetTeams } from '../../api/generated/organizations/endpoints/teams/teams.js';
import { useCollectorNoteControllerSearchNotes } from '@/api/generated/collectors/endpoints/collector-notes/collector-notes';
import { NoteType } from '@/api/generated/collectors_models';
import { TeamPerformanceCard } from './components/TeamPerformanceCard.js';
import { CoachingDrawer } from './components/CoachingDrawer.js';
import { formatDistanceToNow } from 'date-fns';

/**
 * PerformanceCoaching (Leadership Loop)
 * Focus: Manager -> Team Lead interaction.
 * Actions: Encouragement (Praise) vs Support (Diagnostic).
 */
export const PerformanceCoaching: React.FC = () => {
  const { organizationId } = useUser();
  const [showCoachingDrawer, setShowCoachingDrawer] = useState<{ id: string, name: string, type: 'PRAISE' | 'SUPPORT' } | null>(null);

  // 1. Fetch Teams
  const { data: teamsResponse, isLoading: isLoadingTeams } = useTeamsControllerGetTeams(organizationId!);
  const teams = teamsResponse?.data || [];

  // 2. Fetch Leadership Trail (Coaching Notes)
  const { data: notesResponse, isLoading: isLoadingNotes } = useCollectorNoteControllerSearchNotes(organizationId!, {
    type: NoteType.COACHING,
    limit: 5
  });
  const logs = notesResponse?.data || [];

  if (isLoadingTeams) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="animate-pulse text-muted-foreground font-medium">Loading leadership engine...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Roster</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Leadership Coaching</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Leadership Loop</h1>
          <p className="text-sm font-medium text-muted-foreground">Coach Team Leads on operational projections and tactical resource allocation.</p>
        </div>
      </header>

      {/* Team Performance Matrix */}
      <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
        <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Team Performance Matrix</h3>
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">Active Pulse</span>
        </div>
        
        <div className="divide-y divide-border">
          {teams.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground italic">No teams found.</div>
          ) : (
            teams.map((team) => (
              <TeamPerformanceCard
                key={team.id}
                teamId={team.id}
                teamName={team.name}
                managerUserId={team.managerUserId}
                onCoach={(type, name, id) => setShowCoachingDrawer({ id, name, type })}
              />
            ))
          )}
        </div>
      </div>

      {/* Leadership Paper Trail */}
      <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardCheck size={20} className="text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Leadership Paper Trail</h4>
        </div>
        <div className="space-y-4">
          {isLoadingNotes ? (
            <div className="flex justify-center p-4"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
          ) : logs.length === 0 ? (
            <div className="text-xs text-muted-foreground italic">No recent coaching sessions logged.</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-muted-foreground">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                  <p className="text-xs font-medium max-w-md truncate">
                    {log.title}
                  </p>
                </div>
                <span className={cn(
                  "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                  "bg-success/20 text-success" // Mock status for now
                )}>LOGGED</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Coaching Drawer */}
      {showCoachingDrawer && (
        <CoachingDrawer
          isOpen={!!showCoachingDrawer}
          onClose={() => setShowCoachingDrawer(null)}
          leadName={showCoachingDrawer.name}
          leadId={showCoachingDrawer.id}
          type={showCoachingDrawer.type}
        />
      )}
    </div>
  );
};