import React, { useState } from 'react';
import { Search, X, Package, CheckCircle2, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { usePortfolios } from '../../inventory/hooks/usePortfolios.js';
import {
  useTeamsControllerAssignPortfolioToTeam,
  useTeamsControllerRemovePortfolioFromTeam,
  useTeamsControllerGetPortfoliosForTeam,
  getTeamsControllerGetPortfoliosForTeamQueryKey
} from '@/api/generated/organizations/endpoints/teams/teams';
import { useUser } from '@/shared/store/userStore';
import { useToast } from '@/shared/hooks';
import { useQueryClient } from '@tanstack/react-query';

interface PortfolioSelectorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  teamId: string;
}

/**
 * PortfolioSelectorDrawer
 * High-density UI for authorizing a team to work on specific portfolios.
 */
export const PortfolioSelectorDrawer: React.FC<PortfolioSelectorDrawerProps> = ({ isOpen, onClose, teamName, teamId }) => {
  const { organizationId } = useUser();
  const [search, setSearch] = useState('');
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch all portfolios
  const { data: portfoliosData, isLoading: isLoadingPortfolios } = usePortfolios({
    pageSize: 100,
    search: search || undefined
  });
  const portfolios = portfoliosData?.data || [];

  // 2. Fetch currently assigned portfolios for this team
  const { data: assignedPortfoliosData, isLoading: isLoadingAssigned } = useTeamsControllerGetPortfoliosForTeam(
    organizationId!,
    teamId,
    {
      query: {
        enabled: !!organizationId && !!teamId && isOpen,
      }
    }
  );
  const assignments = assignedPortfoliosData?.data || [];
  const assignedIds = new Set(assignments.map((a: any) => a.portfolioId));

  // 3. Assignment Mutation
  const { mutateAsync: assignPortfolio, isPending: isAssigning } = useTeamsControllerAssignPortfolioToTeam();

  // 4. Remove Mutation
  const { mutateAsync: removePortfolio, isPending: isRemoving } = useTeamsControllerRemovePortfolioFromTeam();

  const handleAuthorize = async (portfolioId: string, portfolioName: string) => {
    try {
      await assignPortfolio({
        organizationId: organizationId!,
        teamId,
        portfolioId
      });
      queryClient.invalidateQueries({
        queryKey: getTeamsControllerGetPortfoliosForTeamQueryKey(organizationId!, teamId)
      });
      success('Portfolio Authorized', `${portfolioName} is now authorized for ${teamName}.`);
    } catch (err: any) {
      toastError('Authorization Failed', err.message);
    }
  };

  const handleRemove = async (portfolioId: string, portfolioName: string) => {
    if (!window.confirm(`Remove ${portfolioName} from ${teamName}? Collectors will lose access to this portfolio.`)) {
      return;
    }

    try {
      await removePortfolio({
        organizationId: organizationId!,
        teamId,
        portfolioId
      });
      queryClient.invalidateQueries({
        queryKey: getTeamsControllerGetPortfoliosForTeamQueryKey(organizationId!, teamId)
      });
      success('Portfolio Removed', `${portfolioName} has been removed from ${teamName}.`);
    } catch (err: any) {
      toastError('Removal Failed', err.message);
    }
  };

  if (!isOpen) return null;

  const isLoading = isLoadingPortfolios || isLoadingAssigned;

  return (
    <div className="fixed inset-0 z-[400] flex justify-end bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-card shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full border-l border-border">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
              <Package size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground leading-none">Authorize Portfolios</h3>
              <p className="text-xs font-medium text-muted-foreground mt-1">{teamName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} className="text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tranche inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Portfolio List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : portfolios.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground italic">No portfolios available.</div>
          ) : (
            portfolios.map((port) => {
              const isAuthorized = assignedIds.has(port.id);

              return (
                <div key={port.id} className="p-4 flex items-center justify-between rounded-lg border border-border hover:bg-muted/50 transition-all group">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      <Package size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{port.name}</p>
                      <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase">
                        ${Number(port.totalCurrentBalance).toLocaleString()} • {port.debtCount} accounts
                      </p>
                    </div>
                  </div>
                  {isAuthorized ? (
                    <button
                      onClick={() => handleRemove(port.id, port.name)}
                      disabled={isRemoving}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-error/10 border border-error/20 text-[10px] font-bold text-error hover:bg-error/20 transition-all active:scale-95 flex-shrink-0"
                    >
                      {isRemoving ? <Loader2 size={12} className="animate-spin" /> : <><Trash2 size={12} /> REMOVE</>}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAuthorize(port.id, port.name)}
                      disabled={isAssigning}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary hover:bg-primary/20 transition-all shadow-sm active:scale-95 flex-shrink-0"
                    >
                      {isAssigning ? <Loader2 size={12} className="animate-spin" /> : 'AUTHORIZE'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-border">
          <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary-hover active:scale-95 transition-all">
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};