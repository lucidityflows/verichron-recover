import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  Key, 
  Globe, 
  BellRing, 
  ChevronRight, 
  Save, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Phone,
  MapPin,
  Lock,
  History,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { AuditActionDrawer, type AuditImpact } from '@/shared/components';
import { Link } from '@tanstack/react-router';
import { useUser } from '@/shared/store/userStore';
import { 
  useProfilesControllerFindOneOrganization, 
  useProfilesControllerFindAllAddresses, 
  useProfilesControllerFindAllEmails,
  useProfilesControllerUpdateOrganization,
  useProfilesControllerUpdateAddress,
  useProfilesControllerUpdateEmail
} from '@/api/generated/organizations/endpoints/organizations/organizations';
import { useSettingsControllerUpdateSettings } from '@/api/generated/organizations/endpoints/settings/settings';

type SettingsTab = 'PROFILE' | 'INTEGRATIONS' | 'NOTIFICATIONS' | 'SECURITY';

/**
 * GlobalSettings
 * Centralized configuration for the organization.
 * Organized by functional tabs with Audit-First mutations.
 */
export const GlobalSettings: React.FC = () => {
  const { organizationId, user } = useUser();
  const [activeTab, setActiveTab] = useState<SettingsTab>('PROFILE');
  const [showAuditDrawer, setShowAuditDrawer] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Data Fetching
  const { data: orgData, isLoading: isLoadingOrg } = useProfilesControllerFindOneOrganization(organizationId!);
  const { data: addressData } = useProfilesControllerFindAllAddresses(organizationId!);
  const { data: emailData } = useProfilesControllerFindAllEmails(organizationId!);

  // Mutations
  const { mutateAsync: updateOrg } = useProfilesControllerUpdateOrganization();
  const { mutateAsync: updateAddress } = useProfilesControllerUpdateAddress();
  const { mutateAsync: updateEmail } = useProfilesControllerUpdateEmail();
  const { mutateAsync: updateSettings } = useSettingsControllerUpdateSettings();

  const organization = orgData?.data as any;
  const addresses = Array.isArray(addressData?.data) ? addressData.data : [];
  const emails = Array.isArray(emailData?.data) ? emailData.data : [];

  const primaryAddress = addresses.find((a: any) => a.isPrimary) || addresses[0];
  const supportEmail = emails.find((e: any) => e.email.includes('support')) || emails[0];

  // Mock impacts for the audit drawer
  const sampleImpacts: AuditImpact[] = [
    { label: 'Display Name', previousValue: 'Verichron Global', newValue: 'Debt Lucidity Solutions (Main)', severity: 'INFO' },
    { label: 'Session Timeout', previousValue: '15m', newValue: '30m', severity: 'WARNING' },
  ];

  // Local State
  const [orgForm, setOrgForm] = useState({ name: '', taxId: '' });
  const [addressForm, setAddressForm] = useState({ street1: '', city: '', state: '', postalCode: '' });
  const [emailForm, setEmailForm] = useState('');
  const [integrationsForm, setIntegrationsForm] = useState({
    stripe: { apiKey: '', enabled: false },
    twilio: { apiKey: '', enabled: false },
    sendgrid: { apiKey: '', enabled: false },
  });
  const [securityForm, setSecurityForm] = useState({
    mfaEnforced: false,
    sessionTimeoutMinutes: 30,
    passwordExpiryDays: 0
  });

  // Sync state with data
  useEffect(() => {
    if (organization) {
      setOrgForm({
        name: organization.name || '',
        taxId: organization.taxId || ''
      });
      
      const settings = organization.settings || {};
      const int = settings.integrations || {};
      setIntegrationsForm({
        stripe: { apiKey: int.stripe?.apiKey || '', enabled: int.stripe?.enabled || false },
        twilio: { apiKey: int.twilio?.apiKey || '', enabled: int.twilio?.enabled || false },
        sendgrid: { apiKey: int.sendgrid?.apiKey || '', enabled: int.sendgrid?.enabled || false },
      });

      const sec = settings.security || {};
      setSecurityForm({
        mfaEnforced: sec.mfaEnforced || false,
        sessionTimeoutMinutes: sec.sessionTimeoutMinutes || 30,
        passwordExpiryDays: sec.passwordExpiryDays || 0
      });
    }
    if (primaryAddress) {
      setAddressForm({
        street1: primaryAddress.street1 || '',
        city: primaryAddress.city || '',
        state: primaryAddress.state || '',
        postalCode: primaryAddress.postalCode || ''
      });
    }
    if (supportEmail) {
      setEmailForm(supportEmail.email || '');
    }
  }, [organization, primaryAddress, supportEmail]);

  const toggleKeyVisibility = (key: string) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const calculateImpacts = (): AuditImpact[] => {
    const impacts: AuditImpact[] = [];

    if (organization && orgForm.name !== organization.name) {
      impacts.push({ label: 'Legal Name', previousValue: organization.name, newValue: orgForm.name, severity: 'INFO' });
    }
    if (organization && orgForm.taxId !== organization.taxId) {
      impacts.push({ label: 'Tax ID', previousValue: organization.taxId || 'Not set', newValue: orgForm.taxId, severity: 'WARNING' });
    }
    if (primaryAddress) {
      if (addressForm.street1 !== primaryAddress.street1) impacts.push({ label: 'Street Address', previousValue: primaryAddress.street1, newValue: addressForm.street1, severity: 'INFO' });
      if (addressForm.city !== primaryAddress.city) impacts.push({ label: 'City', previousValue: primaryAddress.city, newValue: addressForm.city, severity: 'INFO' });
      if (addressForm.state !== primaryAddress.state) impacts.push({ label: 'State', previousValue: primaryAddress.state, newValue: addressForm.state, severity: 'INFO' });
      if (addressForm.postalCode !== primaryAddress.postalCode) impacts.push({ label: 'Postal Code', previousValue: primaryAddress.postalCode, newValue: addressForm.postalCode, severity: 'INFO' });
    }
    if (supportEmail && emailForm !== supportEmail.email) {
      impacts.push({ label: 'Support Email', previousValue: supportEmail.email, newValue: emailForm, severity: 'WARNING' });
    }

    // Integration Impacts
    const currentInt = organization?.settings?.integrations || {};
    
    (['stripe', 'twilio', 'sendgrid'] as const).forEach(key => {
      const current = currentInt[key] || {};
      const next = integrationsForm[key];
      
      if (next.apiKey !== (current.apiKey || '')) {
        impacts.push({ label: `${key.charAt(0).toUpperCase() + key.slice(1)} API Key`, previousValue: '••••', newValue: 'Updated', severity: 'CRITICAL' });
      }
      if (next.enabled !== (current.enabled || false)) {
        impacts.push({ 
          label: `${key.charAt(0).toUpperCase() + key.slice(1)} Status`, 
          previousValue: current.enabled ? 'Enabled' : 'Disabled', 
          newValue: next.enabled ? 'Enabled' : 'Disabled', 
          severity: next.enabled ? 'INFO' : 'WARNING' 
        });
      }
    });

    // Security Impacts
    const currentSec = organization?.settings?.security || {};
    if (securityForm.mfaEnforced !== (currentSec.mfaEnforced || false)) {
      impacts.push({ 
        label: 'MFA Enforcement', 
        previousValue: currentSec.mfaEnforced ? 'Enabled' : 'Disabled', 
        newValue: securityForm.mfaEnforced ? 'Enabled' : 'Disabled', 
        severity: securityForm.mfaEnforced ? 'CRITICAL' : 'WARNING' 
      });
    }
    if (securityForm.sessionTimeoutMinutes !== (currentSec.sessionTimeoutMinutes || 30)) {
      impacts.push({ 
        label: 'Session Timeout', 
        previousValue: `${currentSec.sessionTimeoutMinutes || 30}m`, 
        newValue: `${securityForm.sessionTimeoutMinutes}m`, 
        severity: 'WARNING' 
      });
    }
    if (securityForm.passwordExpiryDays !== (currentSec.passwordExpiryDays || 0)) {
      impacts.push({ 
        label: 'Password Expiry', 
        previousValue: currentSec.passwordExpiryDays ? `${currentSec.passwordExpiryDays} Days` : 'No Expiry', 
        newValue: securityForm.passwordExpiryDays ? `${securityForm.passwordExpiryDays} Days` : 'No Expiry', 
        severity: 'WARNING' 
      });
    }

    return impacts;
  };

  const handleSave = () => {
    const impacts = calculateImpacts();
    if (impacts.length === 0) return;
    setShowAuditDrawer(true);
  };

  const handleConfirmAudit = async (reason: string, comment: string) => {
    try {
      const promises = [];

      // Update Org Details
      if (organization && (orgForm.name !== organization.name || orgForm.taxId !== organization.taxId)) {
        promises.push(updateOrg({
          organizationId: organizationId!,
          data: { name: orgForm.name, taxId: orgForm.taxId }
        }));
      }

      // Update Address
      if (primaryAddress && (
        addressForm.street1 !== primaryAddress.street1 ||
        addressForm.city !== primaryAddress.city ||
        addressForm.state !== primaryAddress.state ||
        addressForm.postalCode !== primaryAddress.postalCode
      )) {
        promises.push(updateAddress({
          organizationId: organizationId!,
          addressId: primaryAddress.id,
          data: { ...addressForm }
        }));
      }

      // Update Email
      if (supportEmail && emailForm !== supportEmail.email) {
        promises.push(updateEmail({
          organizationId: organizationId!,
          emailId: supportEmail.id,
          data: { email: emailForm }
        }));
      }

      // Update Settings (Integrations & Security)
      const currentInt = organization?.settings?.integrations || {};
      const hasIntegrationChanges = (['stripe', 'twilio', 'sendgrid'] as const).some(key => {
        const current = currentInt[key] || {};
        const next = integrationsForm[key];
        return next.apiKey !== (current.apiKey || '') || next.enabled !== (current.enabled || false);
      });

      const currentSec = organization?.settings?.security || {};
      const hasSecurityChanges = 
        securityForm.mfaEnforced !== (currentSec.mfaEnforced || false) ||
        securityForm.sessionTimeoutMinutes !== (currentSec.sessionTimeoutMinutes || 30) ||
        securityForm.passwordExpiryDays !== (currentSec.passwordExpiryDays || 0);

      if (hasIntegrationChanges || hasSecurityChanges) {
        promises.push(updateSettings({
          organizationId: organizationId!,
          data: {
            settings: {
              ...organization.settings,
              integrations: integrationsForm,
              security: securityForm
            }
          }
        }));
      }

      await Promise.all(promises);
      setShowAuditDrawer(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  if (isLoadingOrg) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Rules</span>
            <ChevronRight size={12} className="text-muted-foreground" />
            <span className="text-muted-foreground">Global Settings</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">System Configuration</h1>
          <p className="text-sm font-medium text-muted-foreground">Manage organization-wide infrastructure and default behaviors.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Link 
            to="/auditing/logs"
            className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-muted-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <History size={16} />
            Config History
          </Link>
          <button 
            onClick={handleSave}
            disabled={calculateImpacts().length === 0}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
          >
            <Save size={16} />
            Save Preferences
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar (Local) */}
        <div className="lg:col-span-1 space-y-1">
          {[
            { id: 'PROFILE', name: 'Organization Profile', icon: Globe },
            { id: 'INTEGRATIONS', name: 'API & Integrations', icon: Key },
            { id: 'NOTIFICATIONS', name: 'Internal Notifications', icon: BellRing },
            { id: 'SECURITY', name: 'Security & Auth', icon: ShieldCheck },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as SettingsTab)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all text-left group",
                activeTab === item.id 
                  ? "bg-card border border-border text-primary shadow-sm ring-1 ring-border" 
                  : "text-muted-foreground hover:bg-card/50 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={cn(activeTab === item.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {item.name}
              </div>
              {activeTab === item.id && <ChevronRight size={14} />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === 'PROFILE' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-8">
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Organization Profile</h3>
                    <p className="text-xs text-muted-foreground">Legal identity and primary contact information.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Legal Name</label>
                    <input 
                      type="text" 
                      value={orgForm.name} 
                      onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                      className="w-full rounded-lg border-border bg-background text-sm font-bold focus:ring-primary focus:outline-none focus:ring-2 px-3 py-2" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tax ID / EIN</label>
                    <input 
                      type="text" 
                      value={orgForm.taxId} 
                      onChange={(e) => setOrgForm({ ...orgForm, taxId: e.target.value })}
                      className="w-full rounded-lg border-border bg-background text-sm font-mono font-bold focus:ring-primary focus:outline-none focus:ring-2 px-3 py-2" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Primary Contact Person</label>
                    <input type="text" defaultValue={user?.name || 'Current User'} disabled className="w-full rounded-lg border-border bg-muted/50 text-muted-foreground text-sm font-bold px-3 py-2 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Support Email</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input 
                        type="email" 
                        value={emailForm} 
                        onChange={(e) => setEmailForm(e.target.value)}
                        placeholder="support@domain.com" 
                        className="w-full pl-10 rounded-lg border-border bg-background text-sm font-bold focus:ring-primary focus:outline-none focus:ring-2 px-3 py-2" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-tight">
                    <MapPin size={16} className="text-muted-foreground" />
                    Headquarters Address
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-3 space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Street Address</span>
                      <input 
                        type="text" 
                        value={addressForm.street1} 
                        onChange={(e) => setAddressForm({ ...addressForm, street1: e.target.value })}
                        className="w-full rounded-lg border-border bg-background text-sm font-bold focus:ring-primary focus:outline-none focus:ring-2 px-3 py-2" 
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">City</span>
                      <input 
                        type="text" 
                        value={addressForm.city} 
                        onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                        className="w-full rounded-lg border-border bg-background text-sm font-bold focus:ring-primary focus:outline-none focus:ring-2 px-3 py-2" 
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">State</span>
                      <input 
                        type="text" 
                        value={addressForm.state} 
                        onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                        className="w-full rounded-lg border-border bg-background text-sm font-bold focus:ring-primary focus:outline-none focus:ring-2 px-3 py-2" 
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Postal Code</span>
                      <input 
                        type="text" 
                        value={addressForm.postalCode} 
                        onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                        className="w-full rounded-lg border-border bg-background text-sm font-mono font-bold focus:ring-primary focus:outline-none focus:ring-2 px-3 py-2" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'INTEGRATIONS' && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Key size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Active Integrations</h3>
                  <p className="text-xs text-muted-foreground">Manage connections to third-party financial and telephony providers.</p>
                </div>
              </div>
              
              <div className="divide-y divide-border">
                {[
                  { id: 'stripe', name: 'Stripe Payments', desc: 'PCI-compliant payment gateway' },
                  { id: 'twilio', name: 'Twilio VoIP', desc: 'Real-time voice and SMS engine' },
                  { id: 'sendgrid', name: 'SendGrid Email', desc: 'High-volume dunning email dispatch' },
                ].map((integ) => {
                  const config = integrationsForm[integ.id as keyof typeof integrationsForm];
                  return (
                    <div key={integ.id} className="py-6 flex items-start justify-between group">
                      <div className="space-y-3 flex-1 mr-8">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-foreground">{integ.name}</p>
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset transition-colors",
                            config.enabled 
                              ? "bg-success/10 text-success ring-success/20" 
                              : "bg-muted text-muted-foreground ring-border"
                          )}>
                            {config.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{integ.desc}</p>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">API Key / Secret</label>
                          <div className="relative">
                            <input 
                              type={showKeys[integ.id] ? 'text' : 'password'}
                              value={config.apiKey}
                              onChange={(e) => setIntegrationsForm({
                                ...integrationsForm,
                                [integ.id]: { ...config, apiKey: e.target.value }
                              })}
                              className="w-full rounded-md border-border bg-background text-xs font-mono px-3 py-2 pr-10 focus:ring-primary focus:outline-none focus:ring-2"
                              placeholder={`Enter ${integ.name} Key`}
                            />
                            <button
                              onClick={() => toggleKeyVisibility(integ.id)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showKeys[integ.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center pt-1">
                        <button 
                          onClick={() => setIntegrationsForm({
                            ...integrationsForm,
                            [integ.id]: { ...config, enabled: !config.enabled }
                          })}
                          className={cn(
                            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                            config.enabled ? 'bg-primary' : 'bg-muted'
                          )}
                        >
                          <span className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                            config.enabled ? 'translate-x-5' : 'translate-x-0'
                          )} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'SECURITY' && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-8">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-tight">Security & Governance</h3>
                  <p className="text-xs text-muted-foreground">Access control policies and session management.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground uppercase tracking-tight">Enforce Multi-Factor Auth</p>
                    <p className="text-xs text-muted-foreground">Require all collectors and leads to use TOTP.</p>
                  </div>
                  <button 
                    onClick={() => setSecurityForm({ ...securityForm, mfaEnforced: !securityForm.mfaEnforced })}
                    className={cn(
                      "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      securityForm.mfaEnforced ? 'bg-primary' : 'bg-muted'
                    )}
                  >
                    <span className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out",
                      securityForm.mfaEnforced ? 'translate-x-5' : 'translate-x-0'
                    )} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-tight">Admin Session Timeout</label>
                    <select 
                      value={securityForm.sessionTimeoutMinutes}
                      onChange={(e) => setSecurityForm({ ...securityForm, sessionTimeoutMinutes: parseInt(e.target.value) })}
                      className="w-full rounded-md border-border bg-background px-3 py-2 text-sm font-bold focus:ring-primary focus:outline-none focus:ring-2"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={60}>1 Hour</option>
                      <option value={240}>4 Hours</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground uppercase tracking-tight">Password Expiry Policy</label>
                    <select 
                      value={securityForm.passwordExpiryDays}
                      onChange={(e) => setSecurityForm({ ...securityForm, passwordExpiryDays: parseInt(e.target.value) })}
                      className="w-full rounded-md border-border bg-background px-3 py-2 text-sm font-bold focus:ring-primary focus:outline-none focus:ring-2"
                    >
                      <option value={0}>No Expiry</option>
                      <option value={30}>30 Days</option>
                      <option value={90}>90 Days</option>
                      <option value={180}>180 Days</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-xl flex items-center justify-between border border-primary/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Lock size={20} className="text-primary" />
            <h4 className="text-sm font-bold uppercase tracking-widest text-primary">Governance Note</h4>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Changes to system configuration are applied globally. All mutations are recorded in the <span className="text-sidebar-foreground font-bold underline decoration-primary underline-offset-4">Audit Trail</span> and visible to platform administrators.
          </p>
        </div>
      </div>

      <AuditActionDrawer 
        isOpen={showAuditDrawer}
        onClose={() => setShowAuditDrawer(false)}
        onConfirm={handleConfirmAudit}
        title="Commit System Update"
        description="Verify the changes to organization-wide configuration."
        impacts={sampleImpacts}
      />
    </div>
  );
};
