/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-redundant-type-constituents */
import React, { useState } from 'react';
import {
  MessageSquare,
  ChevronRight,
  Plus,
  Mail,
  Smartphone,
  FileText,
  Search,
  Filter,
  History,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Eye,
  BarChart3,
  ArrowUpRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { TemplateEditorDrawer } from './components/TemplateEditorDrawer.js';
import { useCommunicationTemplates } from './hooks/useCommunicationTemplates.js';

/**
 * CommunicationHub
 * Centralized library for Email, SMS, and Letter templates.
 */
export const CommunicationHub: React.FC = () => {
  const [activeChannel, setActiveChannel] = useState<'ALL' | 'EMAIL' | 'SMS' | 'LETTER'>('ALL');
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  const channelFilter = activeChannel === 'ALL' ? undefined : activeChannel;
  const {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    isCreating,
    isUpdating,
    isDeleting
  } = useCommunicationTemplates(channelFilter);

  const filteredTemplates = templates;

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Rules</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Communication Hub</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Template Library</h1>
          <p className="text-sm font-medium text-muted-foreground">Manage multi-channel message templates with versioning and compliance reviews.</p>
        </div>

        <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover transition-all active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Plus size={16} />
          Create Template
        </button>
      </header>

      {/* Engagement Pulse Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Avg Email Open Rate', value: '38.4%', trend: '+4.2%', icon: Mail, iconColor: 'text-blue-600', bgColor: 'bg-blue-500/10' },
          { label: 'SMS Delivery Success', value: '96.2%', trend: 'Stable', icon: Smartphone, iconColor: 'text-success', bgColor: 'bg-success/10' },
          { label: 'Pending Legal Reviews', value: '2', trend: '-1 this week', icon: ShieldCheck, iconColor: 'text-primary', bgColor: 'bg-primary/10' },
        ].map((stat, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <p className="text-xl font-bold font-mono text-foreground">{stat.value}</p>
              <p className="text-[9px] font-medium text-muted-foreground">{stat.trend}</p>
            </div>
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", stat.bgColor)}>
              <stat.icon size={20} className={stat.iconColor} />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 p-1 bg-muted rounded-lg w-full md:w-auto">
          {['ALL', 'EMAIL', 'SMS', 'LETTER'].map((c) => (
            <button
              key={c}
              onClick={() => setActiveChannel(c as any)}
              className={cn(
                "flex-1 md:flex-none px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                activeChannel === c ? "bg-card text-primary shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary bg-card text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTemplates.map((tmpl: any) => (
          <div
            key={tmpl.id}
            onClick={() => setEditingTemplate(tmpl)}
            className="group relative rounded-xl border border-border bg-card p-5 shadow-sm hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center ring-1",
                  tmpl.channel === 'EMAIL' ? "bg-blue-500/10 text-blue-600 ring-blue-500/20" :
                  tmpl.channel === 'SMS' ? "bg-success/10 text-success ring-success/20" : "bg-amber-500/10 text-amber-600 ring-amber-500/20"
                )}>
                  {tmpl.channel === 'EMAIL' && <Mail size={20} />}
                  {tmpl.channel === 'SMS' && <Smartphone size={20} />}
                  {tmpl.channel === 'LETTER' && <FileText size={20} />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{tmpl.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground">{tmpl.version}</span>
                    <span className="text-[10px] text-border">•</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{tmpl.channel}</span>
                  </div>
                </div>
              </div>
              <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all">
                <History size={16} />
              </button>
            </div>

            {/* Engagement Mini-Stats */}
            <div className="flex gap-4 mb-4">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Delivery</p>
                <p className="text-xs font-mono font-bold text-foreground">{tmpl.engagement.deliveryRate}</p>
              </div>
              {tmpl.engagement.openRate && (
                <div className="space-y-0.5 border-l border-border/50 pl-4">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Open Rate</p>
                  <p className="text-xs font-mono font-bold text-foreground">{tmpl.engagement.openRate}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase ring-1",
                  tmpl.status === 'ACTIVE' ? "bg-success/10 text-success ring-success/20" :
                  tmpl.status === 'PENDING_APPROVAL' ? "bg-amber-500/10 text-amber-600 ring-amber-500/20" : "bg-muted text-muted-foreground ring-border"
                )}>
                  {tmpl.status.replace('_', ' ')}
                </span>
                {tmpl.complianceChecked && (
                  <div className="flex items-center gap-1 text-[9px] font-bold text-primary">
                    <ShieldCheck size={12} />
                    CERTIFIED
                  </div>
                )}
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-gradient-to-br from-sidebar via-sidebar to-primary/5 p-6 text-sidebar-foreground shadow-xl border border-primary/10">
        <div className="flex items-start gap-4">
          <div className="bg-primary/20 p-2.5 rounded-xl text-primary ring-1 ring-primary/20 shadow-lg">
            <ShieldCheck size={20} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Compliance Enforced</h4>
              <div className="h-1 flex-1 bg-gradient-to-r from-primary/20 to-transparent rounded-full" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              All <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider border border-primary/20">LETTER</span> templates are automatically verified against state-specific Mini-Miranda requirements.
            </p>
          </div>
        </div>
      </div>

      {editingTemplate && (
        <TemplateEditorDrawer
          isOpen={!!editingTemplate}
          onClose={() => setEditingTemplate(null)}
          template={editingTemplate}
          onSave={updateTemplate}
          isSaving={isUpdating}
        />
      )}
    </div>
  );
};