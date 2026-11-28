import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppPreferences {
  // Sidebar preferences
  sidebarCollapsed: boolean;

  // Table preferences
  itemsPerPage: number;
  defaultTableView: 'grid' | 'list';

  // UI preferences
  compactMode: boolean;
  showHints: boolean;
}

interface AppState extends AppPreferences {
  // Runtime state (not persisted)
  mobileSidebarOpen: boolean;

  // Actions
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setItemsPerPage: (count: number) => void;
  setDefaultTableView: (view: 'grid' | 'list') => void;
  setCompactMode: (compact: boolean) => void;
  setShowHints: (show: boolean) => void;
  resetPreferences: () => void;
}

const DEFAULT_PREFERENCES: AppPreferences = {
  sidebarCollapsed: false,
  itemsPerPage: 25,
  defaultTableView: 'list',
  compactMode: false,
  showHints: true,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Default preferences
      ...DEFAULT_PREFERENCES,

      // Runtime state
      mobileSidebarOpen: false,

      // Actions
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),

      toggleMobileSidebar: () => set({ mobileSidebarOpen: !get().mobileSidebarOpen }),

      setItemsPerPage: (count) => set({ itemsPerPage: count }),

      setDefaultTableView: (view) => set({ defaultTableView: view }),

      setCompactMode: (compact) => set({ compactMode: compact }),

      setShowHints: (show) => set({ showHints: show }),

      resetPreferences: () => set(DEFAULT_PREFERENCES),
    }),
    {
      name: 'app-preferences',
      // Don't persist runtime state
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        itemsPerPage: state.itemsPerPage,
        defaultTableView: state.defaultTableView,
        compactMode: state.compactMode,
        showHints: state.showHints,
      }),
    }
  )
);
