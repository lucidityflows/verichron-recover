import React, { useState, useRef, useEffect } from 'react';
import { 
  Users2, 
  Search, 
  Filter, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Mail,
  ChevronRight,
  MoreHorizontal,
  Loader2,
  Calendar,
  X
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useUser } from '../../shared/store/userStore.js';
import {
  useProfilesControllerFindAll,
  useProfilesControllerInviteDebtor
} from '../../api/generated/debtors/endpoints/debtor-profiles/debtor-profiles.js';
import type { DebtorProfileEntity } from '../../api/generated/debtors_models/index.js';
import { DebtorProfileEntityVerificationStatus, DebtorVerificationStatus } from '../../api/generated/debtors_models/index.js';
import { useToast } from '@/shared/hooks';
import { format, formatDistanceToNow, isAfter, addDays } from 'date-fns';

interface DebtorFilters {
  verificationStatus?: DebtorVerificationStatus;
  hasUserAccount?: boolean;
}

/**
 * DebtorRegistry
 * Strategic master list of all debtor profiles within the organization.
 * Focuses on identity management and digital onboarding (Invitations).
 */
export const DebtorRegistry: React.FC = () => {
  const { organizationId } = useUser();
  const { success, error: toastError } = useToast();
  
  // 1. Search & Filter State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<DebtorFilters>({});
  const filterRef = useRef<HTMLDivElement>(null);
  const pageSize = 15;

  // Close filters when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [filterRef]);

  // 2. Fetch Data
  const { data: debtorsData, isLoading, refetch } = useProfilesControllerFindAll(organizationId!, {
    search: search || undefined,
    verificationStatus: filters.verificationStatus,
    hasUserAccount: filters.hasUserAccount,
    page,
    pageSize
  });

  const paginatedData = debtorsData?.data && typeof debtorsData.data !== 'undefined' && 'data' in debtorsData.data ? debtorsData.data : null;
  const debtors = paginatedData?.data || [];
  const total = paginatedData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // 3. Mutations
  const { mutateAsync: inviteDebtor, isPending: isInviting } = useProfilesControllerInviteDebtor();

  const handleManualInvite = async (debtor: DebtorProfileEntity) => {
    // Basic validation: must have an email to invite
    const allEmails = debtor.emails?.flat() || [];
    const primaryEmail = allEmails.find((e) => e.isPrimary)?.email;
    if (!primaryEmail) {
      toastError('Missing Email', 'This debtor does not have a primary email address associated.');
      return;
    }

    try {
      await inviteDebtor({
        organizationId: organizationId!,
        id: debtor.id,
        data: {
          email: primaryEmail,
          firstName: debtor.firstName,
          lastName: debtor.lastName
        }
      });
      
      success('Invitation Sent', `A portal invitation has been dispatched to ${primaryEmail}`);
      refetch();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to send invitation.';
      toastError('Action Blocked', errorMessage);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-black text-success ring-1 ring-inset ring-success/20 uppercase tracking-tighter">Registered</span>;
      case 'INVITED':
        return <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary ring-1 ring-inset ring-primary/20 uppercase tracking-tighter">Invited</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-600 ring-1 ring-inset ring-amber-500/20 uppercase tracking-tighter">Pending</span>;
    }
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Roster</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Debtor Registry</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Debtor Population</h1>
          <p className="text-sm font-medium text-muted-foreground">Manage digital identities and portal access for all consumers.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full md:w-64 rounded-md border-border bg-card pl-10 pr-4 py-2 text-sm focus:ring-ring focus:border-ring"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors",
                activeFiltersCount > 0 && "ring-primary text-primary bg-primary/5"
              )}
            >
              <Filter size={16} />
              Filters
              {activeFiltersCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-border bg-card shadow-xl z-20 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-foreground">Filter Registry</h4>
                  {(activeFiltersCount > 0) && (
                    <button 
                      onClick={() => setFilters({})}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Verification Status</label>
                    <select
                      value={filters.verificationStatus || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        verificationStatus: e.target.value ? e.target.value as DebtorVerificationStatus : undefined 
                      }))}
                      className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                    >
                      <option value="">All Statuses</option>
                      {Object.values(DebtorVerificationStatus).map(status => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">User Account</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, hasUserAccount: undefined }))}
                        className={cn(
                          "flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors",
                          filters.hasUserAccount === undefined 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "border-border hover:bg-muted"
                        )}
                      >
                        Any
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, hasUserAccount: true }))}
                        className={cn(
                          "flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors",
                          filters.hasUserAccount === true 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "border-border hover:bg-muted"
                        )}
                      >
                        Registered
                      </button>
                      <button
                        onClick={() => setFilters(prev => ({ ...prev, hasUserAccount: false }))}
                        className={cn(
                          "flex-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors",
                          filters.hasUserAccount === false 
                            ? "bg-primary/10 border-primary text-primary" 
                            : "border-border hover:bg-muted"
                        )}
                      >
                        Unregistered
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Consumer Identity</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Status</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Last Invited</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Verification</th>
                <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Hydrating Registry...</p>
                    </div>
                  </td>
                </tr>
              ) : debtors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center italic text-muted-foreground">No debtors found matching your criteria.</td>
                </tr>
              ) : (
                debtors.map((debtor: DebtorProfileEntity) => {
                  const allEmails = debtor.emails?.flat() || [];
                  const primaryEmail = allEmails.find((e) => e.isPrimary)?.email;
                  const canInvite = !isInviting && debtor.status !== 'ACTIVE';
                  
                  // Check cool-down logic for UI hint
                  const nextEligibleDate = debtor.invitedAt 
                    ? addDays(new Date(debtor.invitedAt), 7)
                    : null;
                  const isCoolDownActive = nextEligibleDate && isAfter(nextEligibleDate, new Date());

                  return (
                    <tr key={debtor.id} className="group hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase shadow-inner">
                            {debtor.firstName[0]}{debtor.lastName[0]}
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-sm font-bold text-foreground leading-none">{debtor.firstName} {debtor.lastName}</div>
                            <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">
                              {primaryEmail || 'No email associated'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {getStatusBadge(debtor.status)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {debtor.invitedAt ? (
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-bold text-foreground uppercase tracking-tight flex items-center justify-center gap-1">
                              <Calendar size={10} className="text-muted-foreground" />
                              {formatDistanceToNow(new Date(debtor.invitedAt), { addSuffix: true })}
                            </div>
                            <div className="text-[9px] text-muted-foreground">
                              {format(new Date(debtor.invitedAt), 'MMM d, yyyy')}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground/40 uppercase">Never</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter ring-1 ring-inset",
                          debtor.verificationStatus === DebtorProfileEntityVerificationStatus.verified
                            ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 ring-amber-500/20"
                        )}>
                          {debtor.verificationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={!canInvite || isCoolDownActive || isInviting}
                            onClick={() => handleManualInvite(debtor)}
                            title={isCoolDownActive ? `Cool-down active until ${format(nextEligibleDate, 'MMM d')}` : 'Send invitation'}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-black uppercase transition-all shadow-sm",
                              debtor.status === 'ACTIVE' 
                                ? "bg-success/10 text-success cursor-default"
                                : isCoolDownActive
                                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                  : "bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95"
                            )}
                          >
                            {debtor.status === 'ACTIVE' ? (
                              <CheckCircle2 size={12} />
                            ) : (
                              <Send size={12} />
                            )}
                            {debtor.status === 'ACTIVE' ? 'Joined' : debtor.status === 'INVITED' ? 'Resend' : 'Invite'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded border border-border bg-card text-[10px] font-bold uppercase hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Prev
            </button>
            <div className="flex items-center gap-1 px-2">
              {[...Array(Math.min(5, totalPages))].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={cn(
                    "h-6 w-6 rounded text-[10px] font-black transition-all",
                    page === i + 1 ? "bg-primary text-white shadow-md" : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded border border-border bg-card text-[10px] font-bold uppercase hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
