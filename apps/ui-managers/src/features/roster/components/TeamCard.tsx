import React from 'react';
import { Users2, Package, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { UtilizationGauge } from './UtilizationGauge.js';
import { cn } from '@/shared/utils/cn';

interface TeamCardProps {
  id: string;
  name: string;
  memberCount: number;
  utilization: number;
  projectedUtilization?: number;
  isHovered?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  name,
  memberCount,
  utilization,
  projectedUtilization,
  isHovered,
  onEdit,
  onDelete
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  return (
    <div className={cn(
      "rounded-xl border bg-card p-6 shadow-md transition-all duration-300 hover:shadow-xl",
      isHovered
        ? "border-primary ring-4 ring-primary/10 bg-primary/5 shadow-2xl scale-105"
        : "border-border hover:border-primary/50"
    )}>
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-11 w-11 rounded-xl flex items-center justify-center transition-all",
            isHovered
              ? "bg-primary/20 text-primary ring-2 ring-primary/30 shadow-lg"
              : "bg-primary/10 text-primary"
          )}>
            <Users2 size={22} />
          </div>
          <div>
            <h4 className={cn(
              "text-sm font-bold transition-colors",
              isHovered ? "text-primary" : "text-foreground"
            )}>{name}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {memberCount} Collector{memberCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 p-1.5 rounded-lg transition-all"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 w-40 rounded-lg border border-border bg-card shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
                  >
                    <Pencil size={14} />
                    Edit Team
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium text-error hover:bg-error/10 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete Team
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <UtilizationGauge
          label="Team Capacity"
          current={utilization}
          projected={projectedUtilization}
        />

        <div className="flex items-center gap-2 pt-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
          <div className="h-6 w-6 rounded-md bg-blue-500/10 flex items-center justify-center">
            <Package size={12} className="text-blue-600" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Portfolio view</span>
          <span className="ml-auto text-[10px] font-medium text-muted-foreground italic">In detail</span>
        </div>
      </div>
    </div>
  );
};
