import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Lock, Zap } from 'lucide-react';
import { useAuditsControllerVerifyChain } from '../../../api/generated/audits/endpoints/audits/audits.js';
import { cn } from '@/shared/utils/cn';
import { Button } from '../../../shared/components/Button.js';
import { Badge } from '../../../shared/components/Badge.js';
import { toast } from 'sonner';

interface AuditShieldProps {
  organizationId: string;
  className?: string;
}

/**
 * AuditShield
 * Manager-facing compliance integrity indicator.
 * Communicates "Audit Readiness" and "Immutable Security".
 */
export const AuditShield: React.FC<AuditShieldProps> = ({ organizationId, className }) => {
  const { data, isLoading, isError, refetch, isFetching } = useAuditsControllerVerifyChain(
    organizationId,
    'ORGANIZATION',
    organizationId,
    {
      query: {
        retry: 1,
        // Don't auto-fetch if we don't have an ID yet
        enabled: !!organizationId,
      }
    }
  );

  const handleVerify = async () => {
    try {
      await refetch();
      toast.success('Compliance integrity verified successfully');
    } catch (error) {
      toast.error('Integrity check failed', {
        description: 'Unable to reach the audit verification engine.'
      });
    }
  };

  const result = data?.data;
  const isSecure = result?.valid;
  const totalRecords = result?.totalRecords ?? 0;
  const hasRecords = totalRecords > 0;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all duration-300",
      className
    )}>
      {/* Background Decor */}
      <div className="absolute -right-4 -top-4 opacity-[0.03] rotate-12">
        <ShieldCheck size={120} />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-2 rounded-lg",
              !hasRecords ? "bg-muted text-muted-foreground" :
              isSecure ? "bg-success/10 text-success" : "bg-error/10 text-error"
            )}>
              {!hasRecords ? <Lock size={18} /> :
               isSecure ? <ShieldCheck size={18} /> : <ShieldX size={18} className="animate-pulse" />}
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-primary">Compliance Shield</h3>
              <p className="text-xs font-bold text-foreground truncate">
                {!hasRecords ? 'Ready for Genesis' : isSecure ? 'System Fully Secured' : 'Integrity Alert'}
              </p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleVerify} 
            disabled={isFetching || isLoading}
            className="h-8 w-8 p-0 rounded-full hover:bg-primary/5"
          >
            <RefreshCw size={14} className={cn(isFetching && "animate-spin text-primary")} />
          </Button>
        </div>

        <div className="flex-1 space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Audit Fidelity</span>
              <span className="text-[10px] font-mono font-bold text-foreground">
                {hasRecords ? `${((result?.verifiedRecords ?? 0) / totalRecords * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-1000 rounded-full",
                  isSecure ? "bg-success" : "bg-error"
                )}
                style={{ width: `${hasRecords ? (result?.verifiedRecords ?? 0) / totalRecords * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-muted/30 border border-border/50">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Signed</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{totalRecords.toLocaleString()}</p>
            </div>
            <div className="p-2 rounded bg-muted/30 border border-border/50">
              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Protocol</p>
              <div className="flex items-center gap-1 text-xs font-bold text-foreground">
                <Zap size={10} className="text-amber-500 fill-amber-500" />
                <span className="text-[10px]">SHA-256</span>
              </div>
            </div>
          </div>
        </div>

        {isSecure && hasRecords && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <p className="text-[9px] text-muted-foreground leading-relaxed italic">
              "Verichron ensures each interaction is cryptographically linked to prevent retroactive modification."
            </p>
          </div>
        )}

        {!isSecure && hasRecords && (
          <div className="mt-4 p-2 rounded bg-error/5 border border-error/10">
            <p className="text-[9px] font-bold text-error uppercase leading-tight">
              Evidence Chain Disruption Detected
            </p>
            <p className="text-[8px] text-error/70 mt-0.5">
              Contact Verichron support for forensic validation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
