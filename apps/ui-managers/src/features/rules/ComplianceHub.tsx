import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { Save, History, Gavel, ChevronRight, Search, Loader2 } from 'lucide-react';
import { HardRuleList } from './components/HardRuleList.js';
import { SoftRuleForm } from './components/SoftRuleForm.js';
import { AuditActionDrawer, type AuditImpact } from '@/shared/components';
import { useUser } from '../../shared/store/userStore.js';
import { 
  useSettingsControllerGetSettings, 
  useSettingsControllerUpdateSettings 
} from '../../api/generated/organizations/endpoints/settings/settings.js';
import { type OrganizationSettingsDto, OrganizationSettingsResponseDto } from '../../api/generated/organizations_models/index.js';
import { useToast } from '@/shared/hooks';

/**
 * ComplianceHub
 * Centralized command center for legal and strategic guardrails.
 */
export const ComplianceHub: React.FC = () => {
  const { organizationId } = useUser();
  const { success, error: toastError } = useToast();
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [pendingSettings, setPendingSettings] = useState<OrganizationSettingsDto | null>(null);

  // 1. Fetch Current Settings
  const { data: settingsData, isLoading } = useSettingsControllerGetSettings(organizationId!);
  
  // 2. Update Mutation
  const { mutateAsync: updateSettings } = useSettingsControllerUpdateSettings();

  useEffect(() => {
    if (settingsData?.status === 200 && settingsData.data?.settings) {
      // Cast the JSONB settings to our expected DTO shape
      setPendingSettings(settingsData.data.settings as unknown as OrganizationSettingsDto);
    }
  }, [settingsData]);

  const calculateImpacts = (): AuditImpact[] => {
    if (settingsData?.status !== 200 || !settingsData.data?.settings || !pendingSettings) return [];
    
    const current = settingsData.data.settings as unknown as OrganizationSettingsDto;
    const impacts: AuditImpact[] = [];

    // Compare Time Window
    if (pendingSettings.communicationPreferences?.preferredContactTimeStart !== current.communicationPreferences?.preferredContactTimeStart ||
        pendingSettings.communicationPreferences?.preferredContactTimeEnd !== current.communicationPreferences?.preferredContactTimeEnd) {
      impacts.push({
        label: 'Preferred Calling Window',
        previousValue: `${current.communicationPreferences?.preferredContactTimeStart || '08:00'} - ${current.communicationPreferences?.preferredContactTimeEnd || '21:00'}`,
        newValue: `${pendingSettings.communicationPreferences?.preferredContactTimeStart} - ${pendingSettings.communicationPreferences?.preferredContactTimeEnd}`,
        severity: 'INFO'
      });
    }

    // Compare Frequency (placeholder field)
    if (pendingSettings.businessRules?.maxPaymentPlanDurationMonths !== current.businessRules?.maxPaymentPlanDurationMonths) {
      impacts.push({
        label: 'Weekly Attempt Cap',
        previousValue: `${current.businessRules?.maxPaymentPlanDurationMonths || 7} Attempts`,
        newValue: `${pendingSettings.businessRules?.maxPaymentPlanDurationMonths} Attempts`,
        severity: 'WARNING'
      });
    }

    // Compare Strict Mode
    if (pendingSettings.compliance?.fdcpaStrictMode !== current.compliance?.fdcpaStrictMode) {
      impacts.push({
        label: 'Strict FDCPA Enforcement',
        previousValue: current.compliance?.fdcpaStrictMode ? 'Enabled' : 'Disabled',
        newValue: pendingSettings.compliance?.fdcpaStrictMode ? 'Enabled' : 'Disabled',
        severity: 'CRITICAL'
      });
    }

    return impacts;
  };

  const handlePublishClick = () => {
    const impacts = calculateImpacts();
    if (impacts.length === 0) {
      toastError('No Changes', 'You haven\'t made any changes to the policy.');
      return;
    }
    setShowAuditDrawer(true);
  };

  const handleConfirmPolicy = async (reason: string, comment: string) => {
    try {
      await updateSettings({
        organizationId: organizationId!,
        data: pendingSettings as any
      });
      
      success('Policy Published', 'Communication guardrails updated successfully.');
      setShowAuditDrawer(false);
    } catch (err) {
      toastError('Update Failed', 'Failed to publish compliance policy.');
    }
  };

  if (isLoading || !pendingSettings) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Loading safety protocols...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Rules</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Compliance Hub</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Compliance & Safety</h1>
          <p className="text-sm font-medium text-muted-foreground">Configure legal guardrails and agency-specific communication strategies.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/auditing/logs"
            className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <History size={16} />
            Policy History
          </Link>
          <button
            onClick={handlePublishClick}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Save size={16} />
            Publish Changes
          </button>
        </div>
      </header>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Filter by State (e.g. California)..."
          className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <HardRuleList />
        </div>

        <div className="xl:col-span-2 space-y-6">
          <SoftRuleForm 
            settings={pendingSettings} 
            onChange={setPendingSettings} 
          />
          
          <div className="rounded-xl bg-gradient-to-br from-sidebar via-sidebar to-error/5 p-6 text-sidebar-foreground shadow-xl border border-error/10">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-error/20 p-2.5 rounded-xl text-error ring-1 ring-error/20 shadow-lg">
                <Gavel size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-error">Compliance Notice</h4>
                  <div className="h-1 flex-1 bg-gradient-to-r from-error/20 to-transparent rounded-full" />
                </div>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground pl-11">
              The rules defined here are enforced at the <span className="px-1.5 py-0.5 rounded bg-error/10 text-error font-bold text-[10px] uppercase tracking-wider border border-error/20">API Dispatch level</span>. Any communication attempt that violates these guardrails will be blocked before transmission.
            </p>
          </div>
        </div>
      </div>

      <AuditActionDrawer 
        isOpen={showAuditDrawer}
        onClose={() => setShowAuditDrawer(false)}
        onConfirm={handleConfirmPolicy}
        title="Update Compliance Policy"
        description="Verify the impact of the updated communication guardrails."
        impacts={calculateImpacts()}
      />
    </div>
  );
};