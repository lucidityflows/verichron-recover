import { useQuery } from '@tanstack/react-query';
import { organizationService } from '../../../shared/services/organizationService.js';
import { Modal } from '../../../shared/components/Modal.js';
import { Button } from '../../../shared/components/Button.js';
import { Badge, StatusBadge } from '../../../shared/components/Badge.js';
import { format } from 'date-fns';
import {
  Building2,
  Calendar,
  Hash,
  Tag,
  FileText,
  Clock,
  Terminal
} from 'lucide-react';
import { OrganizationType, OrganizationResponseDto } from '../../../api/generated/organizations_models/index.js';

interface OrganizationDetailsModalProps {
  organizationId: string | null;
  onClose: () => void;
  onEdit?: (org: OrganizationResponseDto) => void;
}

export function OrganizationDetailsModal({ organizationId, onClose, onEdit }: OrganizationDetailsModalProps) {
  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', organizationId],
    queryFn: () => organizationService.getOrganizationById(organizationId!),
    enabled: !!organizationId,
  });

  const getTypeLabel = (type: OrganizationType) => {
    const labels: Record<OrganizationType, string> = {
      [OrganizationType.COLLECTION_AGENCY]: 'Collection Agency',
      [OrganizationType.CREDITOR]: 'Creditor',
      [OrganizationType.PARTNER]: 'Partner',
    };
    return labels[type] || type;
  };

  return (
    <Modal
      isOpen={!!organizationId}
      onClose={onClose}
      title="Tenant Identity Record"
      description="Immutable system profile and operational configuration"
      size="xl"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--color-border)] border-t-indigo-600"></div>
            <p className="text-[var(--color-muted-foreground)] text-[10px] font-black uppercase tracking-widest">Querying Profile...</p>
          </div>
        </div>
      ) : org ? (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="flex items-start gap-6 p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/10">
            <div className="w-16 h-16 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-inner border border-white/10">
              {org.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-foreground">{org.name}</h3>
                <StatusBadge status={org.status} variant="outlined" />
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-1 font-bold uppercase tracking-tight">{org.displayName || 'GENERIC IDENTITY'}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" size="sm" icon={<Tag size={10} />}>
                  {getTypeLabel(org.organizationType)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] mb-2">
                <Hash className="w-3.5 h-3.5 opacity-50" />
                <span>Primary Key (UUID)</span>
              </div>
              <p className="text-foreground font-mono text-xs font-bold truncate">{org.id}</p>
            </div>

            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] mb-2">
                <FileText className="w-3.5 h-3.5 opacity-50" />
                <span>Fiscal ID (EIN)</span>
              </div>
              <p className="text-foreground font-mono text-xs font-bold">{org.taxId || 'NOT PROVIDED'}</p>
            </div>

            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] mb-2">
                <Calendar className="w-3.5 h-3.5 opacity-50" />
                <span>Provisioned At</span>
              </div>
              <p className="text-foreground text-xs font-bold">
                {format(new Date(org.createdAt), 'MMMM d, yyyy · HH:mm')}
              </p>
            </div>

            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] mb-2">
                <Clock className="w-3.5 h-3.5 opacity-50" />
                <span>Last Policy Sync</span>
              </div>
              <p className="text-foreground text-xs font-bold">
                {format(new Date(org.updatedAt), 'MMMM d, yyyy · HH:mm')}
              </p>
            </div>
          </div>

          {/* Settings Section */}
          {org.settings && Object.keys(org.settings).length > 0 && (
            <div className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Environment Kernel</h4>
                <Badge variant="outline" size="sm" icon={<Terminal size={8}/>}>JSON</Badge>
              </div>
              <pre className="text-[11px] text-indigo-400 bg-slate-950 p-4 rounded-lg overflow-x-auto font-mono border border-white/5">
                {JSON.stringify(org.settings, null, 2)}
              </pre>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            {onEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onEdit(org);
                  onClose();
                }}
              >
                Modify Identity
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-xs font-bold text-[var(--color-muted-foreground)] uppercase">Identity not found</p>
        </div>
      )}
    </Modal>
  );
}