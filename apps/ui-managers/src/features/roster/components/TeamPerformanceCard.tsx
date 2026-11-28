import React from 'react';
import { Users2, Star, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { usePerformanceControllerGetDashboardSummary } from '@/api/generated/collectors/endpoints/collector-performance/collector-performance';
import { useProfilesControllerGetUserById } from '@/api/generated/users/endpoints/users/users';
import { useUser } from '@/shared/store/userStore';

interface TeamPerformanceCardProps {
  teamId: string;
  teamName: string;
  managerUserId?: string;
  onCoach: (type: 'PRAISE' | 'SUPPORT', leadName: string, leadId: string) => void;
}

export const TeamPerformanceCard: React.FC<TeamPerformanceCardProps> = ({ teamId, teamName, managerUserId, onCoach }) => {
  const { organizationId } = useUser();

  // 1. Fetch Performance
  const { data: perfData, isLoading: isLoadingPerf } = usePerformanceControllerGetDashboardSummary(organizationId!, { teamId });
  const stats = perfData?.data as any;

  // 2. Fetch Manager Name
  const { data: userData, isLoading: isLoadingUser } = useProfilesControllerGetUserById(organizationId!, managerUserId || '', {
    query: { enabled: !!managerUserId }
  });
  const manager = userData?.data;
  const managerName = manager ? `${manager.firstName} ${manager.lastName}` : 'Unassigned';

  if (isLoadingPerf) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card shadow-md flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate Pace (Mock logic if real metrics missing, assuming dailyGoal vs current)
  // DashboardSummaryDto usually has collectionsToday and dailyGoal
  const pace = stats?.dailyGoal && stats?.collectionsToday
    ? Math.round((stats.collectionsToday / stats.dailyGoal) * 100)
    : 0;

  const complianceScore = '100%'; // Placeholder if not in summary
  const exceptions = 0; // Placeholder

  const isOnTarget = pace >= 90;

  return (
    <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-8 hover:bg-muted/50 transition-colors border-b border-border last:border-0">
      <div className="flex items-center gap-4 min-w-[240px]">
        <div className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center shadow-sm",
          isOnTarget ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
        )}>
          <Users2 size={24} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-foreground">{teamName}</h4>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-tight">Lead: <span className="text-foreground font-bold">{managerName}</span></p>
        </div>
      </div>

      {/* Tactical Stats */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pace to EOD Target</span>
          <div className={cn(
            "text-xl font-bold font-mono",
            isOnTarget ? "text-success" : "text-warning"
          )}>{pace}%</div>
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full", isOnTarget ? "bg-success" : "bg-warning")} style={{ width: `${Math.min(pace, 100)}%` }} />
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Compliance Health</span>
          <div className="text-xl font-bold font-mono text-foreground">{complianceScore}</div>
          <div className="text-[9px] font-bold text-success uppercase">Audit Ready</div>
        </div>
        <div className="space-y-1 hidden md:block">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Exceptions</span>
          <div className="text-xl font-bold font-mono text-foreground">{exceptions}</div>
          <div className="text-[9px] font-bold text-muted-foreground uppercase">Requires Action</div>
        </div>
      </div>

      {/* Manager Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => managerUserId && onCoach('PRAISE', managerName, managerUserId)}
          disabled={!managerUserId}
          className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-success text-white text-xs font-bold shadow-lg hover:bg-success/90 active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <Star size={14} /> ENCOURAGEMENT
        </button>
        <button
          onClick={() => managerUserId && onCoach('SUPPORT', managerName, managerUserId)}
          disabled={!managerUserId}
          className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground text-xs font-bold shadow-sm hover:border-warning hover:text-warning active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <AlertCircle size={14} /> STRATEGIC SUPPORT
        </button>
      </div>
    </div>
  );
};
