/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment */
import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  LogOut, 
  Sun, 
  Moon, 
  ChevronDown, 
  Check, 
  Settings,
  Shield
} from 'lucide-react';
import { useTheme, Theme } from '../hooks/useTheme';
import { useUser } from '../store/userStore';
import { tokenStorage, tokenRefreshService } from '@verichron/auth-utils';
import { cn } from '../utils/cn';

/**
 * UserMenu
 * A "Quiet" dropdown for user profile, theme selection, and logout.
 */
export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setThemeByName } = useTheme();
  const { user, roles } = useUser();

  const userName = user?.name || 'Unknown User';
  const userEmail = user?.email || 'No email';
  // Display the first role, nicely formatted (e.g. ORG_ADMIN -> Org Admin)
  const userRole = roles[0]?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) || 'Member';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    tokenRefreshService.stop();
    tokenStorage.clearTokens();
    window.location.href = import.meta.env.VITE_AUTH_URL || 'http://localhost:5173/login';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1 rounded-full hover:bg-muted transition-all group"
      >
        <div className="flex flex-col items-end mr-1 hidden lg:flex">
          <span className="text-xs font-bold text-foreground">{userName}</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{userRole}</span>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground border border-border group-hover:border-primary/30 group-hover:bg-card transition-all">
          <User size={20} />
        </div>
        <ChevronDown size={14} className={cn("text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card shadow-xl z-[400] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* User Info Header */}
          <div className="p-4 border-b border-border bg-muted/50">
            <p className="text-sm font-bold text-foreground">{userName}</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>

          {/* Theme Selection Section */}
          <div className="p-2 border-b border-border">
            <div className="px-3 py-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Interface Theme</span>
            </div>
            <div className="grid grid-cols-2 gap-1 px-1">
              <button
                onClick={() => setThemeByName('light')}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                  theme === 'light'
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Sun size={14} /> Light
              </button>
              <button
                onClick={() => setThemeByName('dark')}
                className={cn(
                  "flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all",
                  theme === 'dark'
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Moon size={14} /> Dark
              </button>
            </div>
          </div>

          {/* Action Links */}
          <div className="p-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-foreground hover:bg-muted transition-all">
              <Settings size={16} /> User Settings
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-foreground hover:bg-muted transition-all">
              <Shield size={16} /> Privacy & Safety
            </button>
          </div>

          {/* Logout Section */}
          <div className="p-1 border-t border-border bg-muted/30">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold text-error hover:bg-error/10 transition-all"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
