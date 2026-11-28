import { Link, useLocation } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Bell,
  MessageSquare,
  Scale,
  FlaskConical,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Activity,
  Users
} from 'lucide-react';
import { cn } from '../../shared/utils/cn.js';
import { tokenStorage, tokenRefreshService } from '@verichron/auth-utils';
import { useAppStore } from '../../shared/store/index.js';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  search?: Record<string, any>;
  icon: typeof LayoutDashboard;
  disabled?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'Platform Overview',
    items: [
      { name: 'Control Center', href: '/', icon: Activity },
      { name: 'Organizations', href: '/organizations', icon: Building2 },
    ]
  },
  {
    title: 'Operations',
    items: [
      { name: 'Users & RBAC', href: '/users', icon: Users },
      { name: 'Communications', href: '/communications', icon: MessageSquare },
      { name: 'Creditor Master', href: '/creditors', icon: Scale },
      { name: 'Billing', href: '/invoicing', icon: CreditCard, disabled: true },
    ]
  },
  {
    title: 'Infrastructure',
    items: [
      { name: 'System Health', href: '/health', icon: Activity },
      { name: 'Audit Trail', href: '/audits', icon: Shield },
      { name: 'QA Sandbox', href: '/sandbox', icon: FlaskConical },
    ]
  },
  {
    title: 'Preferences',
    items: [
      { name: 'Global Settings', href: '/settings', icon: Settings },
    ]
  }
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed);
  const mobileSidebarOpen = useAppStore((state) => state.mobileSidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const toggleMobileSidebar = useAppStore((state) => state.toggleMobileSidebar);
  const setMobileSidebarOpen = useAppStore((state) => state.setMobileSidebarOpen);
  const location = useLocation();

  const handleLogout = () => {
    tokenRefreshService.stop();
    tokenStorage.clearTokens();
    window.location.href = import.meta.env.VITE_AUTH_URL || 'http://localhost:5173/login';
  };

  return (
    <div className="flex h-screen bg-[var(--color-background)] overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full bg-[var(--color-card)] border-r border-[var(--color-border)] transition-all duration-300 ease-in-out',
          'lg:relative lg:z-0',
          'flex flex-col',
          sidebarCollapsed ? 'lg:w-16' : 'lg:w-64',
          mobileSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center border-b border-[var(--color-border)] px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-[var(--color-primary)] font-bold text-white shadow-md">V</div>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black tracking-tighter text-[var(--color-foreground)] uppercase truncate">Ops Terminal</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-widest leading-none">Verichron</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden ml-auto text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          {navigation.map((section) => (
            <div key={section.title} className="mb-6 last:mb-0">
              {!sidebarCollapsed && (
                <h3 className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">
                  {section.title}
                </h3>
              )}
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const currentTab =
                    typeof location.search === 'object' && location.search !== null && 'tab' in location.search
                      ? (location.search as { tab?: string }).tab
                      : undefined;
                  const isActive = location.pathname === item.href && 
                    (!item.search?.tab || currentTab === item.search.tab);
                  
                  if (item.disabled) {
                    return (
                      <li key={item.name} className="px-3 py-2 flex items-center gap-3 text-[var(--color-muted-foreground)]/40 cursor-not-allowed">
                        <item.icon size={18} />
                        {!sidebarCollapsed && <span className="text-sm font-medium">{item.name}</span>}
                      </li>
                    );
                  }

                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        search={item.search}
                        title={sidebarCollapsed ? item.name : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                          isActive
                            ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-sm ring-1 ring-[var(--color-primary)]/20"
                            : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                        )}
                        onClick={() => setMobileSidebarOpen(false)}
                      >
                        <item.icon size={18} className={cn(
                          "flex-shrink-0 transition-colors",
                          isActive ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]"
                        )} />
                        {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-[var(--color-border)] p-3 space-y-2 bg-[var(--color-muted)]/30">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium',
              'text-[var(--color-muted-foreground)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)] transition-all duration-200',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>

          <button
            onClick={toggleSidebar}
            className={cn(
              'hidden lg:flex items-center gap-3 px-3 py-2 w-full rounded-lg text-[var(--color-muted-foreground)] hover:bg-[var(--color-card)] hover:text-[var(--color-foreground)] transition-all duration-200',
              sidebarCollapsed && 'justify-center'
            )}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!sidebarCollapsed && <span className="text-[10px] font-bold uppercase tracking-tight">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-card)] px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleMobileSidebar}
              className="lg:hidden text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div>
              <h2 className="text-sm font-bold text-[var(--color-foreground)] uppercase tracking-tight">Utility Operations Hub</h2>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-[var(--color-muted-foreground)] font-bold uppercase tracking-widest">Global Network Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-[var(--color-muted)] transition-colors border border-[var(--color-border)]">
              <Bell size={18} className="text-[var(--color-muted-foreground)]" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[var(--color-error)] rounded-full"></span>
            </button>
            <div className="h-8 w-8 rounded-full bg-[var(--color-muted)] border border-[var(--color-border)] flex items-center justify-center text-xs font-bold text-[var(--color-foreground)]">
              PA
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[var(--color-background)]">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}