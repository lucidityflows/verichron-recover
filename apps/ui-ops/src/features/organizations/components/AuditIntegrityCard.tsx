import { ShieldCheck, ShieldAlert, ShieldX, RefreshCw, Lock } from 'lucide-react';
import { useAuditsControllerVerifyChain } from '../../../api/generated/audits/endpoints/audits/audits.js';
import { Card } from '../../../shared/components/Card.js';
import { Button } from '../../../shared/components/Button.js';
import { Badge } from '../../../shared/components/Badge.js';
import { cn } from '../../../shared/utils/cn.js';
import { toast } from 'sonner';

interface AuditIntegrityCardProps {
  organizationId: string;
}

export function AuditIntegrityCard({ organizationId }: AuditIntegrityCardProps) {
  const { data, isLoading, isError, refetch, isFetching } = useAuditsControllerVerifyChain(
    organizationId,
    'ORGANIZATION',
    organizationId,
    {
      query: {
        retry: 1,
      }
    }
  );

  const handleVerify = async () => {
    try {
      await refetch();
      toast.success('Integrity verification complete');
    } catch (error) {
      toast.error('Verification failed');
    }
  };

  if (isLoading) {
    return (
      <Card title="Audit Integrity" className="relative overflow-hidden">
        <div className="h-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-border)] border-t-indigo-600"></div>
        </div>
      </Card>
    );
  }

  const result = data?.data;
  const isSecure = result?.valid;
  const hasRecords = (result?.totalRecords ?? 0) > 0;

  return (
    <Card 
      title="Compliance Evidence" 
      subtitle="Cryptographic Chain Verification"
      headerAction={
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleVerify} 
          disabled={isFetching}
          className="h-7 px-2"
        >
          <RefreshCw className={cn("w-3 h-3 mr-1.5", isFetching && "animate-spin")} />
          Verify
        </Button>
      }
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-500",
          !hasRecords ? "bg-slate-500/10 text-slate-500" :
          isSecure ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
        )}>
          {!hasRecords ? <Lock className="w-6 h-6 opacity-40" /> :
           isSecure ? <ShieldCheck className="w-6 h-6" /> : <ShieldX className="w-6 h-6 animate-pulse" />}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground uppercase tracking-tight">
              {!hasRecords ? 'Genesis Pending' : isSecure ? 'Immutable Chain Intact' : 'Chain Integrity Compromised'}
            </span>
            {hasRecords && (
              <Badge variant={isSecure ? 'success' : 'error'} size="sm" className="text-[8px] font-black uppercase">
                {isSecure ? 'Verified' : 'Tampered'}
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-widest mt-0.5">
            {hasRecords ? `${result?.verifiedRecords} / ${result?.totalRecords} blocks validated via SHA-256` : 'No audit records detected for this identity.'}
          </p>
        </div>
      </div>

      {result?.brokenLinks && result.brokenLinks.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/10 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5" />
          <div>
            <p className="text-[10px] font-black text-red-500 uppercase">Forensic Alert</p>
            <p className="text-[10px] text-[var(--color-muted-foreground)] font-medium leading-relaxed">
              Broken link detected at block #{result.brokenLinks[0].position}. 
              ID: <span className="font-mono">{result.brokenLinks[0].recordId.substring(0, 8)}...</span>
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
