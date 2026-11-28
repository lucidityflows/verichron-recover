import React, { useState } from 'react';
import {
  BarChart3,
  ChevronRight,
  Download,
  Clock,
  FileText,
  Calendar,
  Zap,
  TrendingUp,
  PieChart,
  Users,
  Shield,
  PlayCircle,
  Mail,
  Settings,
  Plus,
  X,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { useUser } from '@/shared/store/userStore.js';
import { auditsControllerFindAll } from '@/api/generated/audits/endpoints/audits/audits.js';

type GenerationStatus = 'idle' | 'generating' | 'complete';

/**
 * ReportsCenter (The Data Room)
 * Enhanced with interactive generation flow and scheduling modals.
 */
export const ReportsCenter: React.FC = () => {
  const { organizationId } = useUser();
  const [activeView, setActiveView] = useState<'QUICK' | 'SCHEDULED' | 'ARCHIVE'>('QUICK');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>('idle');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [generatedReportName, setGeneratedReportName] = useState('');
  const [generatedReportRecords, setGeneratedReportRecords] = useState(0);

  const quickReports = [
    { id: 'daily-ops', name: 'Daily Operations Summary', category: 'OPERATIONS', icon: TrendingUp, estimatedTime: '15s', targetType: undefined as string | undefined },
    { id: 'team-perf', name: 'Team Performance Snapshot', category: 'ROSTER', icon: Users, estimatedTime: '20s', targetType: 'USER' },
    { id: 'compliance-status', name: 'Compliance Status Report', category: 'LEGAL', icon: Shield, estimatedTime: '10s', targetType: 'ORGANIZATION' },
    { id: 'portfolio-roi', name: 'Portfolio ROI Analysis', category: 'FINANCIAL', icon: PieChart, estimatedTime: '25s', targetType: 'PORTFOLIO' },
  ];

  const scheduledReports = [
    {
      id: 'sch_1',
      name: 'Daily Operations Report',
      frequency: 'DAILY',
      time: '18:00',
      recipients: ['managers@agency.com'],
      lastRun: 'Today, 18:00',
      status: 'ACTIVE'
    },
    {
      id: 'sch_2',
      name: 'Weekly Team Performance',
      frequency: 'WEEKLY',
      time: 'Mon 09:00',
      recipients: ['leadership@agency.com'],
      lastRun: 'Dec 23, 09:00',
      status: 'ACTIVE'
    },
    {
      id: 'sch_3',
      name: 'Monthly Executive Summary',
      frequency: 'MONTHLY',
      time: '1st, 08:00',
      recipients: ['executives@agency.com', 'board@agency.com'],
      lastRun: 'Dec 01, 08:00',
      status: 'ACTIVE'
    },
  ];

  const archivedReports = [
    { id: 'arch_1', name: 'Daily Operations Report', generatedAt: 'Today, 18:00', size: '2.4 MB', format: 'PDF' },
    { id: 'arch_2', name: 'Daily Operations Report', generatedAt: 'Yesterday, 18:00', size: '2.3 MB', format: 'PDF' },
    { id: 'arch_3', name: 'Weekly Team Performance', generatedAt: 'Dec 23, 09:00', size: '5.1 MB', format: 'PDF' },
  ];

  const handleGenerateReport = async (reportId: string, reportName: string) => {
    setGeneratingReport(reportId);
    setGenerationStatus('generating');
    try {
      if (!organizationId) {
        throw new Error('Organization context missing');
      }

      const selectedReport = quickReports.find((report) => report.id === reportId);
      const response = await auditsControllerFindAll(organizationId, {
        pageSize: 100,
        targetType: selectedReport?.targetType,
      });

      setGeneratedReportName(reportName);
      setGeneratedReportRecords(response.data.data.length);
      setGenerationStatus('complete');
      setShowDownloadModal(true);
    } catch (_error) {
      setGenerationStatus('idle');
    } finally {
      setGeneratingReport(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-widest">
            <span>The Evidence</span>
            <ChevronRight size={12} className="text-border" />
            <span className="text-muted-foreground">Reports Center</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">System Analytics</h1>
          <p className="text-sm font-medium text-muted-foreground">Generate, schedule, and export high-density operational reports.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-2 rounded-md bg-card px-3 py-2 text-sm font-bold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus size={16} />
            New Schedule
          </button>
          <button className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-md hover:bg-primary-hover active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Zap size={16} />
            Custom Query
          </button>
        </div>
      </header>

      {/* View Tabs */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveView('QUICK')}
          className={cn(
            "px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            activeView === 'QUICK' ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          )}
        >
          Quick Reports
        </button>
        <button
          onClick={() => setActiveView('SCHEDULED')}
          className={cn(
            "px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            activeView === 'SCHEDULED' ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          )}
        >
          Scheduled
        </button>
        <button
          onClick={() => setActiveView('ARCHIVE')}
          className={cn(
            "px-6 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            activeView === 'ARCHIVE' ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
          )}
        >
          Archive
        </button>
      </div>

      {/* Quick Reports View */}
      {activeView === 'QUICK' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <Zap size={20} className="text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary">One-Click Generation</h4>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Quick reports generate instantly with <span className="text-sidebar-foreground font-bold">current system state</span>. Perfect for ad-hoc analysis and on-demand downloads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {quickReports.map((report) => (
              <div key={report.id} className="group relative rounded-xl border border-border bg-card p-5 shadow-md hover:border-primary transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <report.icon size={24} />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-muted text-foreground">
                    {report.category}
                  </span>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground leading-tight">{report.name}</h4>

                  <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground uppercase">
                    <Clock size={10} />
                    Est. {report.estimatedTime}
                  </div>

                  <button
                    onClick={() => handleGenerateReport(report.id, report.name)}
                    disabled={generatingReport === report.id}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold shadow-md transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      generatingReport === report.id
                        ? "bg-primary text-primary-foreground cursor-wait"
                        : "bg-primary text-primary-foreground hover:bg-primary-hover active:scale-95"
                    )}
                  >
                    {generatingReport === report.id ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <PlayCircle size={14} />
                        Generate Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Reports View */}
      {activeView === 'SCHEDULED' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <Calendar size={20} className="text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Automated Distribution</h4>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Scheduled reports run automatically at configured intervals and are emailed to designated recipients. Zero manual effort required.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
            <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-tight">
                <Calendar size={14} />
                Active Schedules
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">{scheduledReports.length} Configured</span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Report Name</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Schedule</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recipients</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Last Run</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {scheduledReports.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-muted transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-muted-foreground" />
                        <span className="font-bold text-foreground text-sm">{schedule.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex w-fit px-2 py-0.5 rounded uppercase font-bold text-[9px] bg-primary/10 text-primary">
                          {schedule.frequency}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">{schedule.time}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Mail size={12} className="text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{schedule.recipients.length} recipient{schedule.recipients.length > 1 ? 's' : ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Clock size={10} />
                        {schedule.lastRun}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-muted-foreground hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                          <Settings size={14} />
                        </button>
                        <button className="p-1.5 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                          <PlayCircle size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Archive View */}
      {activeView === 'ARCHIVE' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-sidebar p-6 text-sidebar-foreground shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <FileText size={20} className="text-primary" />
              <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Report History</h4>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              All generated reports are archived for <span className="text-sidebar-foreground font-bold">12 months</span>. Download previous reports or regenerate with updated data.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
            <div className="p-4 border-b border-border bg-muted flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-tight">
                <FileText size={14} />
                Generated Reports
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search reports..."
                  className="px-3 py-1.5 text-xs rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                />
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Report Name</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Generated</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Format</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Size</th>
                  <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {archivedReports.map((report) => (
                  <tr key={report.id} className="hover:bg-muted transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-muted-foreground" />
                        <span className="font-bold text-foreground text-sm">{report.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                        <Clock size={10} />
                        {report.generatedAt}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-muted text-foreground">
                        {report.format}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-muted-foreground font-mono">{report.size}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="flex items-center gap-1 text-xs font-bold text-primary hover:text-primary-hover uppercase tracking-widest ml-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                        <Download size={12} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-sidebar/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-md w-full animate-fade-in">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle size={20} className="text-success" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Report Generated</h3>
                    <p className="text-xs text-muted-foreground">{generatedReportName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="p-1 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-muted border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground">Report Details</span>
                  <span className="text-[10px] font-bold text-success uppercase">Ready</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span className="font-mono font-bold text-foreground">PDF</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Size:</span>
                    <span className="font-mono font-bold text-foreground">{generatedReportRecords} records</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Generated:</span>
                    <span className="font-mono font-bold text-foreground">Just now</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Close
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-hover active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <Download size={14} />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-sidebar/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-2xl max-w-lg w-full animate-fade-in">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Create Report Schedule</h3>
                  <p className="text-xs text-muted-foreground">Automate report generation and distribution</p>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="p-1 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-tight">Report Template</label>
                <select className="w-full rounded-lg border-border bg-card text-sm font-medium text-foreground focus:ring-ring">
                  <option>Daily Operations Summary</option>
                  <option>Weekly Team Performance</option>
                  <option>Monthly Executive Summary</option>
                  <option>Quarterly Compliance Certification</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground uppercase tracking-tight">Frequency</label>
                  <select className="w-full rounded-lg border-border bg-card text-sm font-medium text-foreground focus:ring-ring">
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Quarterly</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground uppercase tracking-tight">Time</label>
                  <input
                    type="time"
                    defaultValue="18:00"
                    className="w-full rounded-lg border-border bg-card text-sm font-medium text-foreground focus:ring-ring"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-tight">Recipients</label>
                <input
                  type="text"
                  placeholder="Enter email addresses (comma-separated)"
                  className="w-full rounded-lg border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:ring-ring"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-sm font-bold text-foreground hover:bg-muted transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  Cancel
                </button>
                <button className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:bg-primary-hover active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  Create Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
