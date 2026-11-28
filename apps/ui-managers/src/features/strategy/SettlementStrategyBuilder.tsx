import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { Save, History, ShieldCheck, ChevronRight, TrendingUp } from 'lucide-react';
import { AuthorityMatrix } from './components/AuthorityMatrix.js';
import { AuditActionDrawer, type AuditImpact } from '@/shared/components';
import { useSettlementStrategy } from './hooks/useSettlementStrategy.js';
import { AuthorityRoleType } from '../../api/generated/organizations_models/index.js';

/**
 * SettlementStrategyBuilder
 * Unified dashboard for Settlement Authority and Payment Plan guardrails.
 */
export const SettlementStrategyBuilder: React.FC = () => {
  const {
    matrix,
    isLoadingMatrix,
    ladder,
    isLoadingLadder,
    updateMatrix,
    updateLadder,
    isUpdatingLadder
  } = useSettlementStrategy();

  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Settlement Thresholds
  const [settlementThresholds, setSettlementThresholds] = useState({
    singlePayment: 5000,
    maxInstallments: 12
  });
  const [originalSettlementThresholds, setOriginalSettlementThresholds] = useState({
    singlePayment: 5000,
    maxInstallments: 12
  });

  // Payment Plan Thresholds
  const [planThresholds, setPlanThresholds] = useState({
    maxDuration: 24,
    minDownPayment: 10
  });
  const [originalPlanThresholds, setOriginalPlanThresholds] = useState({
    maxDuration: 24,
    minDownPayment: 10
  });
  
  // Matrix State
  const [localMatrix, setLocalMatrix] = useState<any[]>([]);

  // Sync Matrix
  useEffect(() => {
    if (matrix && matrix.length > 0) {
      setLocalMatrix(JSON.parse(JSON.stringify(matrix)));
    }
  }, [matrix]);

  // Sync Thresholds from Ladder
  useEffect(() => {
    if (ladder.length > 0) {
      const collectorTier = ladder.find(t => t.roleType === AuthorityRoleType.COLLECTOR) || ladder[0];
      if (collectorTier) {
        // Settlement Limits
        const newSettlement = {
          singlePayment: Number(collectorTier.maxDollarAmount) || 5000,
          maxInstallments: collectorTier.maxPlanDurationMonths || 12
        };
        setSettlementThresholds(newSettlement);
        setOriginalSettlementThresholds(newSettlement);

        // Payment Plan Limits
        const newPlan = {
          maxDuration: (collectorTier as any).maxPlanDurationMonths || 24,
          minDownPayment: Number((collectorTier as any).minDownPaymentPercent) || 10
        };
        setPlanThresholds(newPlan);
        setOriginalPlanThresholds(newPlan);
      }
    }
  }, [ladder]);

  const handleUpdateMatrixCell = (minBalance: number, minAge: number, newValue: number) => {
    setLocalMatrix(prev => {
      const exists = prev.some(cell => 
        Number(cell.minBalance) === minBalance && 
        Number(cell.minAgeDays) === minAge
      );

      if (exists) {
        return prev.map(cell => {
          if (Number(cell.minBalance) === minBalance && Number(cell.minAgeDays) === minAge) {
            return { ...cell, maxDiscountPercent: newValue };
          }
          return cell;
        });
      }
      return [...prev, { minBalance, minAgeDays: minAge, maxDiscountPercent: newValue }];
    });
  };

  const calculateImpacts = (): AuditImpact[] => {
    const impacts: AuditImpact[] = [];

    // Settlement Impacts
    if (settlementThresholds.singlePayment !== originalSettlementThresholds.singlePayment) {
      impacts.push({
        label: 'Settlement: Max Amount',
        previousValue: `$${originalSettlementThresholds.singlePayment.toLocaleString()}`,
        newValue: `$${settlementThresholds.singlePayment.toLocaleString()}`,
        severity: 'CRITICAL'
      });
    }

    // Plan Impacts
    if (planThresholds.minDownPayment !== originalPlanThresholds.minDownPayment) {
      impacts.push({
        label: 'Plans: Min Down Payment',
        previousValue: `${originalPlanThresholds.minDownPayment}%`,
        newValue: `${planThresholds.minDownPayment}%`,
        severity: 'WARNING'
      });
    }

    // Matrix Impacts
    let changedCells = 0;
    localMatrix.forEach(localCell => {
      const originalCell = matrix.find(m => 
        Number(m.minBalance) === Number(localCell.minBalance) && 
        Number(m.minAgeDays) === Number(localCell.minAgeDays)
      );
      if (!originalCell && localCell.maxDiscountPercent > 0) changedCells++;
      else if (originalCell && originalCell.maxDiscountPercent !== localCell.maxDiscountPercent) changedCells++;
    });

    if (changedCells > 0) {
      impacts.push({
        label: 'Matrix Adjustments',
        previousValue: 'Original Grid',
        newValue: `${changedCells} cells modified`,
        severity: 'CRITICAL'
      });
    }

    return impacts;
  };

  const handleConfirmChange = async (reason: string, comment: string) => {
    try {
      const updatedLadder = ladder.map(tier => {
        if (tier.roleType === AuthorityRoleType.COLLECTOR) {
          return {
            ...tier,
            // Settlement Limits
            maxDollarAmount: Number(settlementThresholds.singlePayment),
            maxPlanDurationMonths: settlementThresholds.maxInstallments,
            // Plan Limits
            minDownPaymentPercent: planThresholds.minDownPayment
          };
        }
        return tier;
      });

      await updateLadder({
        thresholds: updatedLadder as any,
        reasonCode: reason,
        comment
      });

      await updateMatrix({
        matrix: localMatrix,
        reasonCode: reason,
        comment
      });

      setShowAuditDrawer(false);
      setIsEditing(false);
      setOriginalSettlementThresholds(settlementThresholds);
      setOriginalPlanThresholds(planThresholds);
      alert('Financial strategy updated successfully.');
    } catch (err) {
      console.error('Failed to publish strategy:', err);
      alert('Failed to publish strategy.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>Control Tower</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Financial Strategy</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Settlement Authority</h1>
          <p className="text-sm font-medium text-muted-foreground">Define organization-wide rules for settlements and payment plans.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/auditing/logs"
            className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors"
          >
            <History size={16} />
            Change Log
          </Link>
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-colors active:scale-95"
            >
              <ShieldCheck size={16} />
              Edit Strategy
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSettlementThresholds(originalSettlementThresholds);
                  setPlanThresholds(originalPlanThresholds);
                  setLocalMatrix(JSON.parse(JSON.stringify(matrix)));
                }}
                className="flex items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAuditDrawer(true)}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-colors active:scale-95"
              >
                <Save size={16} />
                Review & Publish
              </button>
            </>
          )}
        </div>
      </header>

      {/* Guardrails Banner */}
      <div className="rounded-xl bg-muted/30 border border-border p-4 flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex-shrink-0 flex items-center gap-2">
          <ShieldCheck size={16} />
          Global Guardrails
        </h4>
        <div className="h-4 w-px bg-border hidden md:block" />
        <div className="flex flex-col md:flex-row gap-6 w-full">
          <div className="flex gap-3 items-center">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 text-[10px] font-bold">1</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-bold">Hard Lock:</span> Max 80% discount globally to mitigate "Extreme Loss" risk.
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 text-[10px] font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground font-bold">State Compliance:</span> MA, NY, CA disclosures auto-appended.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Column: Matrix (2/3) */}
        <div className="xl:col-span-2 space-y-6">
          <AuthorityMatrix 
            matrix={localMatrix} 
            isLoading={isLoadingMatrix} 
            onUpdate={handleUpdateMatrixCell}
            isEditing={isEditing}
          />
        </div>

        {/* Right Column: Rules (1/3) */}
        <div className="space-y-6">
          {/* Settlement Rules */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck size={16} className="text-success" />
              Settlement Approval
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Max Auto-Approve</label>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-mono font-bold text-muted-foreground">$</span>
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={settlementThresholds.singlePayment.toLocaleString()}
                      onChange={(e) => setSettlementThresholds({...settlementThresholds, singlePayment: Number(e.target.value.replace(/,/g, ''))})}
                      className="bg-transparent border-none p-0 text-right text-sm font-mono font-bold text-foreground focus:ring-0 w-16" 
                    />
                  ) : (
                    <span className="text-sm font-mono font-bold text-foreground">{settlementThresholds.singlePayment.toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Max Installments</label>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={settlementThresholds.maxInstallments}
                      onChange={(e) => setSettlementThresholds({...settlementThresholds, maxInstallments: Number(e.target.value)})}
                      className="bg-transparent border-none p-0 text-right text-sm font-mono font-bold text-foreground focus:ring-0 w-12" 
                    />
                  ) : (
                    <span className="text-sm font-mono font-bold text-foreground">{settlementThresholds.maxInstallments}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground uppercase">Mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Plan Rules */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-tight flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Payment Plan Rules
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Min Down Payment</label>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={planThresholds.minDownPayment}
                      onChange={(e) => setPlanThresholds({...planThresholds, minDownPayment: Number(e.target.value)})}
                      className="bg-transparent border-none p-0 text-right text-sm font-mono font-bold text-foreground focus:ring-0 w-12" 
                    />
                  ) : (
                    <span className="text-sm font-mono font-bold text-foreground">{planThresholds.minDownPayment}</span>
                  )}
                  <span className="text-sm font-mono font-bold text-muted-foreground">%</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Max Duration</label>
                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={planThresholds.maxDuration}
                      onChange={(e) => setPlanThresholds({...planThresholds, maxDuration: Number(e.target.value)})}
                      className="bg-transparent border-none p-0 text-right text-sm font-mono font-bold text-foreground focus:ring-0 w-12" 
                    />
                  ) : (
                    <span className="text-sm font-mono font-bold text-foreground">{planThresholds.maxDuration}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground uppercase">Mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AuditActionDrawer
        isOpen={showAuditDrawer}
        onClose={() => setShowAuditDrawer(false)}
        onConfirm={handleConfirmChange}
        title="Publish Strategy Update"
        description="Verify the impact of the new settlement authority rules and payment plan thresholds."
        impacts={calculateImpacts()}
        isSubmitting={isUpdatingLadder}
      />
    </div>
  );
};