import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Zap,
  ShieldAlert,
  GanttChart,
  Repeat,
  Package,
  Layers,
  PlusCircle,
  Database,
  Users2,
  UserCog,
  LineChart,
  Settings2,
  MessageSquare,
  BarChart3,
  ClipboardList,
  History,
  Menu,
  X,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '../utils/cn.js';
import { useAppStore } from '../store/index.js';
import { useUser } from '../store/userStore.js';
import { useRealtime } from '../contexts/RealtimeContext.js';
import { useEscalations } from '../../features/pulse/hooks/useEscalations.js';

interface NavItem {
  name: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  badgeType?: 'ERROR' | 'WARNING' | 'INFO';
}

interface DomainSection {
  title: string;
  items: NavItem[];
}

/**
 * Modern ERP-style Sidebar
 * Organized by the "Five Domains" vision
 */
export function Sidebar() {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const mobileSidebarOpen = useAppStore((state) => state.mobileSidebarOpen);
  const setMobileSidebarOpen = useAppStore((state) => state.setMobileSidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);

  const { isConnected } = useRealtime();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { roles } = useUser();

  // Get unread escalations count
  const { items: unreadEscalations } = useEscalations({ isRead: false });
  const escalationsCount = unreadEscalations.length;

  const domains: DomainSection[] = [
    {
      title: 'The Pulse',
      items: [
        { name: 'Control Tower', icon: LayoutDashboard, path: '/' },
        {
          name: 'Escalations',
          icon: ShieldAlert,
          path: '/escalations',
          badge: escalationsCount > 0 ? escalationsCount : undefined,
          badgeType: 'ERROR'
        },
      ],
    },
    {
      title: 'The Strategy',
      items: [
        { name: 'Settlements', icon: GanttChart, path: '/strategy/settlements' },
        { name: 'Workflows', icon: Repeat, path: '/strategy/workflows' },
      ],
    },
    {
      title: 'The Inventory',
      items: [
        { name: 'Portfolios', icon: Package, path: '/inventory/portfolios' },
        { name: 'Segmentation', icon: Layers, path: '/inventory/segmentation' },
        { name: 'Ingestion', icon: PlusCircle, path: '/inventory/ingestion' },
        { name: 'Creditor Master', icon: Database, path: '/inventory/creditors' },
      ],
    },
    {
      title: 'The Roster',
      items: [
        { name: 'Debtor Registry', icon: Users2, path: '/inventory/debtors' },
        { name: 'Staff', icon: UserCog, path: '/roster/staff' },
        { name: 'Teams', icon: Users2, path: '/roster/teams' },
        { name: 'Coaching', icon: LineChart, path: '/roster/coaching' },
      ],
    },
    {
      title: 'The Rules',
      items: [
        { name: 'Compliance', icon: Zap, path: '/rules/compliance' },
        { name: 'Templates', icon: MessageSquare, path: '/rules/communications' },
        { name: 'Global Settings', icon: Settings2, path: '/rules/settings' },
      ],
    },
    {
      title: 'The Evidence',
      items: [
        { name: 'Reports Center', icon: BarChart3, path: '/auditing/reports' },
        { name: 'Audit Requests', icon: ClipboardList, path: '/auditing/requests' },
        { name: 'Audit Trail', icon: History, path: '/auditing/logs' },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <div
            className="h-full w-72 bg-card shadow-2xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-lg font-bold text-primary font-sans tracking-tight uppercase">Verichron</span>
              <button onClick={() => setMobileSidebarOpen(false)}><X size={24} className="text-muted-foreground" /></button>
            </div>
            <nav className="space-y-6">
              {domains.map((domain) => (
                <div key={domain.title}>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{domain.title}</h3>
                  <ul className="space-y-1">
                    {domain.items.map((item) => (
                      <li key={item.path}>
                        <Link
                          to={item.path}
                          onClick={() => setMobileSidebarOpen(false)}
                          className={cn(
                            "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all",
                            pathname === item.path ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20" : "text-foreground hover:bg-muted"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon size={18} />
                            {item.name}
                          </div>
                          {item.badge && (
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white",
                              item.badgeType === 'ERROR' ? "bg-red-500" : "bg-indigo-500"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden h-screen flex-col border-r border-border bg-card shadow-sm transition-all duration-300 md:flex",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <div className="flex h-16 items-center border-b border-border px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-primary font-bold text-white shadow-md">V</div>
            {!sidebarCollapsed && (
              <span className="text-sm font-black tracking-tighter text-foreground uppercase whitespace-nowrap">Verichron Recover</span>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {domains.map((domain) => (
            <div key={domain.title} className="mb-6">
              {!sidebarCollapsed && (
                <h3 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {domain.title}
                </h3>
              )}
              <ul className="space-y-1">
                {domain.items.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <li key={item.path} className="relative">
                      <Link
                        to={item.path}
                        title={sidebarCollapsed ? item.name : undefined}
                        className={cn(
                          "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                            : "text-foreground hover:bg-muted hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <item.icon size={18} className={cn(
                            "flex-shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )} />
                          {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                        </div>
                        {item.badge && !sidebarCollapsed && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none",
                            item.badgeType === 'ERROR' ? "bg-error text-error-foreground shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-primary text-white shadow-sm"
                          )}>
                            {item.badge}
                          </span>
                        )}
                        {item.badge && sidebarCollapsed && (
                          <div className={cn(
                            "absolute top-1 right-1 h-2 w-2 rounded-full border-2",
                            item.badgeType === 'ERROR' ? "bg-error border-card" : "bg-primary border-card"
                          )} />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Improved Realtime Status in Footer */}
        <div className="border-t border-border p-3 bg-muted">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all border",
            isConnected 
              ? "text-success bg-card shadow-sm border-success/20" 
              : "text-warning bg-warning/5 border-warning/20"
          )}>
            {isConnected ? (
              <Wifi size={16} className="animate-pulse" />
            ) : (
              <Wifi size={16} className="opacity-50" />
            )}
            {!sidebarCollapsed && (
              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-[10px] font-black uppercase tracking-tighter truncate">
                  {isConnected ? 'Real-time Linked' : 'Connecting...'}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={toggleSidebar}
            className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-card hover:shadow-sm hover:text-foreground transition-all"
          >
            <div className={cn("transition-transform duration-300", sidebarCollapsed && "rotate-180")}>
              <X size={18} className="rotate-45" />
            </div>
            {!sidebarCollapsed && <span className="text-sm font-bold uppercase tracking-tight text-[10px]">Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}