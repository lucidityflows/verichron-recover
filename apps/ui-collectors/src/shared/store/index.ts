import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Sidebar state
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;

  // Actions
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      sidebarCollapsed: false,
      mobileSidebarOpen: false,

      // Actions
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    {
      name: 'app-storage', // localStorage key
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }), // Only persist sidebar collapsed state
    }
  )
);
