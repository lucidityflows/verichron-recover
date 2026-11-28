import { useState } from 'react';
import { Zap, Plus, RefreshCw } from 'lucide-react';
import { WorkflowRules } from './components/WorkflowRules.js';
import { AutoAssignment } from './components/AutoAssignment.js';
import { EscalationRules } from './components/EscalationRules.js';
import { ExecutionHistory } from './components/ExecutionHistory.js';
import { WorkflowAnalyticsDashboard } from './components/WorkflowAnalyticsDashboard.js';

type TabId = 'rules' | 'auto-assign' | 'escalation' | 'history' | 'analytics';

interface Tab {
  id: TabId;
  label: string;
  description: string;
}

const TABS: Tab[] = [
  { id: 'rules', label: 'Workflow Rules', description: 'Automated triggers and actions' },
  { id: 'auto-assign', label: 'Auto-Assignment', description: 'Automatic workload distribution' },
  { id: 'escalation', label: 'Escalation Rules', description: 'Alert escalation configuration' },
  { id: 'history', label: 'Execution History', description: 'Past workflow executions' },
  { id: 'analytics', label: 'Analytics', description: 'Performance metrics' },
];

export function WorkflowAutomationPage() {
  const [activeTab, setActiveTab] = useState<TabId>('rules');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'rules':
        return <WorkflowRules />;
      case 'auto-assign':
        return <AutoAssignment />;
      case 'escalation':
        return <EscalationRules />;
      case 'history':
        return <ExecutionHistory />;
      case 'analytics':
        return <WorkflowAnalyticsDashboard />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-down">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-foreground)]">Workflow Automation</h1>
            <p className="text-muted-foreground mt-1">
              Automate task assignment, escalations, and business processes
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-2">
        <div className="flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[180px] px-4 py-3 rounded-lg text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-[var(--color-primary)] text-white shadow-md'
                  : 'text-[var(--color-foreground)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              <div className="font-semibold text-sm mb-0.5">{tab.label}</div>
              <div
                className={`text-xs ${
                  activeTab === tab.id ? 'text-white/80' : 'text-muted-foreground'
                }`}
              >
                {tab.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in-up">{renderTabContent()}</div>
    </div>
  );
}
