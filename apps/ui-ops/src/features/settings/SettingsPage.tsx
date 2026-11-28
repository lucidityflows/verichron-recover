import { useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Bell,
  Mail,
  Lock,
  Globe,
  Database,
  Save,
  RotateCcw,
  Layout
} from 'lucide-react';
import { Card } from '../../shared/components/Card.js';
import { Button } from '../../shared/components/Button.js';
import { Input } from '../../shared/components/Input.js';
import { Select, SelectOption } from '../../shared/components/Select.js';
import { Badge } from '../../shared/components/Badge.js';
import { toast } from 'sonner';
import { cn } from '../../shared/utils/cn.js';

type SettingsTab = 'general' | 'security' | 'notifications' | 'integrations' | 'advanced';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [hasChanges, setHasChanges] = useState(false);

  // General Settings State
  const [platformName, setPlatformName] = useState('Verichron Recover');
  const [supportEmail, setSupportEmail] = useState('support@verichroninc.com');
  const [defaultTimezone, setDefaultTimezone] = useState('America/Chicago');
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');

  // Security Settings State
  const [sessionTimeout, setSessionTimeout] = useState('3600');
  const [passwordMinLength, setPasswordMinLength] = useState('12');
  const [mfaRequired, setMfaRequired] = useState(true);
  const [ipWhitelist, setIpWhitelist] = useState('');

  // Notification Settings State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('admin@verichroninc.com');

  const timezoneOptions: SelectOption[] = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'UTC', label: 'UTC' },
  ];

  const dateFormatOptions: SelectOption[] = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
  ];

  const tabs = [
    { id: 'general' as SettingsTab, label: 'Platform Core', icon: Layout },
    { id: 'security' as SettingsTab, label: 'Policy & Guard', icon: Lock },
    { id: 'notifications' as SettingsTab, label: 'Alerting', icon: Bell },
    { id: 'integrations' as SettingsTab, label: 'Gateway Bridge', icon: Globe },
    { id: 'advanced' as SettingsTab, label: 'Kernel Conf', icon: Database },
  ];

  const handleSave = () => {
    toast.success('System configuration updated successfully');
    setHasChanges(false);
  };

  const handleReset = () => {
    toast.info('Local changes discarded');
    setHasChanges(false);
  };

  const markChanged = () => {
    if (!hasChanges) setHasChanges(true);
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-500/10 text-slate-500 border border-slate-500/20 shadow-sm">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Kernel Configuration
            </h1>
            <p className="text-[10px] text-[var(--color-muted-foreground)] font-black uppercase tracking-widest mt-1">Platform Global Environment Variables</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasChanges && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                icon={RotateCcw}
              >
                Discard
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                icon={Save}
              >
                Commit Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-[var(--color-muted)]/30 rounded-xl w-fit border border-[var(--color-border)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-tight transition-all duration-200",
              activeTab === tab.id
                ? "bg-[var(--color-card)] text-indigo-500 shadow-sm ring-1 ring-[var(--color-border)]"
                : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-card)]/50"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <Card title="Core Environment" subtitle="Primary platform identity and regionalization">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Platform Descriptor"
                    value={platformName}
                    onChange={(e) => { setPlatformName(e.target.value); markChanged(); }}
                    placeholder="Verichron Recover"
                  />

                  <Input
                    label="System Support Email"
                    type="email"
                    value={supportEmail}
                    onChange={(e) => { setSupportEmail(e.target.value); markChanged(); }}
                    placeholder="support@verichroninc.com"
                  />

                  <Select
                    label="Global Timezone"
                    value={defaultTimezone}
                    onChange={(e) => { setDefaultTimezone(e.target.value); markChanged(); }}
                    options={timezoneOptions}
                  />

                  <Select
                    label="Standard Date Format"
                    value={dateFormat}
                    onChange={(e) => { setDateFormat(e.target.value); markChanged(); }}
                    options={dateFormatOptions}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <Card title="Security Protocols" subtitle="Global authorization and encryption policies">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Session Duration (sec)"
                    type="number"
                    value={sessionTimeout}
                    onChange={(e) => { setSessionTimeout(e.target.value); markChanged(); }}
                    placeholder="3600"
                  />

                  <Input
                    label="Passphrase Entropy (min)"
                    type="number"
                    value={passwordMinLength}
                    onChange={(e) => { setPasswordMinLength(e.target.value); markChanged(); }}
                    placeholder="12"
                  />
                </div>

                <div className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)]/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground uppercase tracking-tight">Strict Multi-Factor Auth</p>
                    <p className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase">Enforce hardware/app MFA for all platform access</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={mfaRequired}
                      onChange={(e) => { setMfaRequired(e.target.checked); markChanged(); }}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-[var(--color-muted)] rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 shadow-inner"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Network IP Whitelist</label>
                  <textarea
                    value={ipWhitelist}
                    onChange={(e) => { setIpWhitelist(e.target.value); markChanged(); }}
                    placeholder="0.0.0.0/0 (Standard IPv4 CIDR)"
                    rows={4}
                    className="w-full px-4 py-3 bg-[var(--color-muted)]/30 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-[11px] text-foreground"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Integration Settings */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              {(
                [
                  { name: 'SendGrid', desc: 'Primary SMTP & Marketing Relay', icon: Mail, status: 'CONNECTED', variant: 'success' },
                  { name: 'Twilio', desc: 'Voice Synthesis & SMS Termination', icon: Bell, status: 'CONNECTED', variant: 'success' },
                  { name: 'Stripe', desc: 'Merchant Payment Infrastructure', icon: Globe, status: 'STANDBY', variant: 'warning' }
                ] as const
              ).map((gate) => (
                <Card key={gate.name} className="p-0 overflow-hidden">
                  <div className="p-6 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-[var(--color-muted)] border border-[var(--color-border)]">
                        <gate.icon size={24} className="text-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-foreground uppercase tracking-tight">{gate.name}</h4>
                          <Badge variant={gate.variant} size="sm">{gate.status}</Badge>
                        </div>
                        <p className="text-xs text-[var(--color-muted-foreground)] mt-1 font-medium">{gate.desc}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Configure Bridge</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Info/Status */}
        <div className="space-y-6">
          <Card title="Kernel Status">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Platform Version</span>
                <span className="text-[11px] font-mono font-bold text-foreground">v2.4.0-stable</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[var(--color-border)]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Sync Mode</span>
                <Badge variant="success" size="sm">Active Relay</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Last Deploy</span>
                <span className="text-[11px] font-bold text-foreground">Jan 22, 2026</span>
              </div>
            </div>
          </Card>

          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-start gap-3">
              <Shield size={16} className="text-amber-500 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Kernel Warning</p>
                <p className="text-[11px] text-[var(--color-muted-foreground)] mt-1 font-medium leading-relaxed">
                  Modifying global environment variables may trigger immediate service container recycling across the cluster.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}