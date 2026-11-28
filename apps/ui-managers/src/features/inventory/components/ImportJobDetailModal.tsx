/* eslint-disable */
import React from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  FileUp,
  Package,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useImportJobStatus } from '../hooks/useImportJobs.js';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from '@tanstack/react-router';

interface ImportJobDetailModalProps {
  jobId: string;
  onClose: () => void;
}

/**
 * ImportJobDetailModal
 *
 * Displays comprehensive import job details including:
 * - Job metadata (name, status, timestamps)
 * - Progress tracking (rows processed, percentage)
 * - Error details (if failed)
 * - Portfolio link (if completed)
 *
 * Auto-refreshes every 5 seconds for PROCESSING jobs.
 */
export const ImportJobDetailModal: React.FC<ImportJobDetailModalProps> = ({
  jobId,
  onClose
}) => {
  const navigate = useNavigate();
  const { data: response, isLoading, error } = useImportJobStatus(jobId);

  const job = response?.data;

  // Handle loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-sidebar/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-2xl bg-card rounded-xl shadow-2xl p-8 border border-border">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Loading import details...</span>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error || !job) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-sidebar/60 backdrop-blur-sm p-4">
        <div className="w-full max-w-2xl bg-card rounded-xl shadow-2xl p-8 border border-border">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-8 w-8 text-error" />
            <span className="text-sm font-medium text-muted-foreground">Failed to load import details</span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isProcessing = job.status === 'PROCESSING' || job.status === 'VALIDATING' || job.status === 'PENDING';
  const isCompleted = job.status === 'COMPLETED';
  const isFailed = job.status === 'FAILED';

  const statusConfig = {
    COMPLETED: { icon: CheckCircle2, colorClass: 'text-success', bgClass: 'bg-success/10', ringClass: 'ring-success/20' },
    PROCESSING: { icon: Loader2, colorClass: 'text-primary', bgClass: 'bg-primary/10', ringClass: 'ring-primary/20' },
    VALIDATING: { icon: Loader2, colorClass: 'text-primary', bgClass: 'bg-primary/10', ringClass: 'ring-primary/20' },
    PENDING: { icon: Clock, colorClass: 'text-muted-foreground', bgClass: 'bg-muted', ringClass: 'ring-border' },
    FAILED: { icon: AlertCircle, colorClass: 'text-error', bgClass: 'bg-error/10', ringClass: 'ring-error/20' },
  };

  const config = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.PENDING;
  const StatusIcon = config.icon;

  const handleNavigateToPortfolio = () => {
    if (job.portfolioId) {
      navigate({ to: `/inventory/portfolios/${job.portfolioId}` });
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-sidebar/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-card rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-border my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={cn(
          "px-6 py-4 border-b border-border flex items-center justify-between",
          isCompleted ? "bg-success/5" : isFailed ? "bg-error/5" : "bg-muted"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              config.bgClass
            )}>
              <StatusIcon
                size={24}
                className={cn(
                  config.colorClass,
                  job.status === 'PROCESSING' && "animate-spin"
                )}
              />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Import Job Details
              </h3>
              <p className="text-lg font-bold text-foreground leading-tight">
                {job.portfolioName || 'Unnamed Portfolio'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Current Status
              </div>
              <span className={cn(
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ring-inset",
                config.bgClass,
                config.colorClass,
                config.ringClass
              )}>
                <StatusIcon size={14} className={job.status === 'PROCESSING' ? "animate-spin" : ""} />
                {job.status}
              </span>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Job ID
              </div>
              <span className="text-xs font-mono text-muted-foreground">{job.id.slice(0, 8)}</span>
            </div>
          </div>

          {/* Progress Section (if applicable) */}
          {job.totalRows && (
            <div className="space-y-3 border-t border-border pt-6">
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black font-mono text-foreground">
                    {job.processedRows.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">
                    / {job.totalRows.toLocaleString()} Rows
                  </span>
                </div>
                <span className="text-xs font-black font-mono text-primary">
                  {(job.progressPercentage as number | undefined)?.toFixed(0) || 0}%
                </span>
              </div>
              <div className="h-3 w-full bg-muted rounded-full overflow-hidden relative">
                <div
                  className={cn(
                    "h-full transition-all duration-500 ease-out",
                    isCompleted ? "bg-success" : isFailed ? "bg-error" : "bg-primary"
                  )}
                  style={{ width: `${job.progressPercentage || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <FileUp size={12} />
                Total Rows
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                {job.totalRows?.toLocaleString() || 'N/A'}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <TrendingUp size={12} />
                Processed
              </div>
              <div className="text-xl font-bold font-mono text-foreground">
                {job.processedRows.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Clock size={12} />
                Created
              </div>
              <div className="text-sm font-medium text-foreground">
                {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>

          {/* Error Message (if failed) */}
          {isFailed && job.errorMessage && (
            <div className="border-t border-border pt-6">
              <div className="rounded-lg bg-error/5 border border-error/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-error">
                  <AlertCircle size={14} />
                  Error Details
                </div>
                <p className="text-sm text-foreground font-mono">
                  {String(job.errorMessage)}
                </p>
              </div>
            </div>
          )}

          {/* Portfolio Link (if completed) */}
          {isCompleted && job.portfolioId && (
            <div className="border-t border-border pt-6">
              <div className="rounded-lg bg-success/5 border border-success/20 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-success">
                  <CheckCircle2 size={14} />
                  Import Completed Successfully
                </div>
                <button
                  onClick={handleNavigateToPortfolio}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:bg-primary-hover transition-colors shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Package size={16} />
                  View Portfolio
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Real-time Update Indicator */}
          {isProcessing && (
            <div className="px-4 py-2 bg-muted border border-border rounded-lg flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                Auto-refreshing every 5 seconds...
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted border-t border-border flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Last updated: {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-foreground border border-border rounded-lg hover:bg-card transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
