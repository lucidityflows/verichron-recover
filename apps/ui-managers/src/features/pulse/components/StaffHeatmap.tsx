import React from 'react';
import { Users2, Monitor } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { type TeamStatusCollector } from '../../../shared/services/dashboardService.js';

interface StaffHeatmapProps {
  teamStatus?: TeamStatusCollector[];
  isLoading?: boolean;
}

/**
 * StaffHeatmap
 * Real-time Roster Status component.
 */
export const StaffHeatmap: React.FC<StaffHeatmapProps> = ({ teamStatus = [], isLoading = false }) => {
  
  const counts = teamStatus.reduce(
    (acc, collector) => {
      const status = collector.status.toLowerCase();
      if (status === 'online') acc.available++;
      else if (status === 'meeting') acc.onCall++; // Mapping meeting to "On Call" bucket for now
      else if (status === 'break') acc.idle++;
      else acc.offline++;
      return acc;
    },
    { available: 0, onCall: 0, idle: 0, offline: 0 }
  );

  const stats = [
    { label: 'Available', value: counts.available, color: 'text-success', bg: 'bg-success/10' },
    { label: 'On Call', value: counts.onCall, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Idle', value: counts.idle, color: 'text-warning', bg: 'bg-warning/10' },
    { label: 'Offline', value: counts.offline, color: 'text-muted-foreground', bg: 'bg-muted' },
  ];

  if (isLoading) {
    return (
      <div className="h-full rounded-xl border border-border bg-card p-6 shadow-md flex items-center justify-center min-h-[300px]">
        <div className="animate-pulse text-muted-foreground">Loading roster...</div>
      </div>
    );
  }

  if (teamStatus.length === 0) {
    return (
      <div className="h-full rounded-xl border border-border bg-card p-8 shadow-md flex flex-col items-center justify-center text-center space-y-4 min-h-[300px]">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <Users2 size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">No Collectors Active</h3>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Invite staff members or assign them to teams to see real-time status.
          </p>
        </div>
        <Link 
          to="/roster/staff"
          className="rounded-md bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary-hover transition-colors"
        >
          Manage Staff
        </Link>
      </div>
    );
  }

  return (
    <div className="h-full rounded-xl border border-border bg-card p-6 shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Staff Heatmap</h3>
        <Users2 size={18} className="text-muted-foreground" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`rounded-lg ${stat.bg} p-3 border border-transparent hover:border-border transition-all cursor-pointer`}>
            <div className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Activity Pulse</div>
        <div className="flex gap-1 h-8 items-end">
          {/* Mock pulse bars for now, could be driven by recent activity volume later */}
          {[40, 70, 45, 90, 65, 80, 30, 50, 85, 60, 75, 40, 95, 50].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/20 rounded-t-sm hover:bg-primary transition-colors"
              style={{ height: `${h}%` }}
            ></div>
          ))}
        </div>
      </div>

      <Link 
        to="/roster/staff"
        className="mt-6 w-full flex items-center justify-center gap-2 rounded-md border border-border py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95"
      >
        <Monitor size={14} />
        VIEW LIVE ROSTER
      </Link>
    </div>
  );
};
