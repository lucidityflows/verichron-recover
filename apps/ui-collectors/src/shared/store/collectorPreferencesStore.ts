import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Work Mode Types
 *
 * FLOW_STATE: System-led, auto-connect after countdown
 * STRATEGY_MODE: Collector-led, manual dial with planning
 */
export type WorkMode = 'FLOW_STATE' | 'STRATEGY_MODE';

/**
 * Session state for tracking current work session
 */
interface WorkSession {
  id: string;
  mode: WorkMode;
  startedAt: Date;
  accountsWorked: number;
  skipsUsed: number;
}

/**
 * Collector Preferences State
 *
 * Persisted to localStorage for cross-session consistency
 */
interface CollectorPreferencesState {
  // Work mode preferences
  lastUsedMode: WorkMode | null;
  flowStateCountdownSeconds: number;

  // Flow State settings
  flowStateSkipsRemaining: number;
  flowStateSkipsPerHour: number;
  flowStateSkipsResetAt: Date | null;

  // Strategy Mode settings
  strategyModeShowAllQueue: boolean;

  // Current session (not persisted - reset on page reload)
  currentSession: WorkSession | null;

  // Actions
  setLastUsedMode: (mode: WorkMode) => void;
  setFlowStateCountdown: (seconds: number) => void;
  setStrategyModeShowAllQueue: (show: boolean) => void;

  // Session management
  startSession: (mode: WorkMode) => void;
  endSession: () => void;
  incrementAccountsWorked: () => void;

  // Flow State skip management
  useSkip: () => boolean; // Returns false if no skips remaining
  resetSkipsIfNeeded: () => void;
  getSkipsRemaining: () => number;
}

const SKIPS_PER_HOUR = 5; // Default: 5 skips per hour

export const useCollectorPreferencesStore = create<CollectorPreferencesState>()(
  persist(
    (set, get) => ({
      // Initial state
      lastUsedMode: null,
      flowStateCountdownSeconds: 45, // 45 seconds default
      flowStateSkipsRemaining: SKIPS_PER_HOUR,
      flowStateSkipsPerHour: SKIPS_PER_HOUR,
      flowStateSkipsResetAt: null,
      strategyModeShowAllQueue: false,
      currentSession: null,

      // Mode preference
      setLastUsedMode: (mode) => set({ lastUsedMode: mode }),

      // Flow State countdown preference
      setFlowStateCountdown: (seconds) =>
        set({ flowStateCountdownSeconds: Math.max(15, Math.min(120, seconds)) }),

      // Strategy Mode preference
      setStrategyModeShowAllQueue: (show) =>
        set({ strategyModeShowAllQueue: show }),

      // Start a work session
      startSession: (mode) => {
        const session: WorkSession = {
          id: crypto.randomUUID(),
          mode,
          startedAt: new Date(),
          accountsWorked: 0,
          skipsUsed: 0,
        };
        set({
          currentSession: session,
          lastUsedMode: mode,
        });

        // Reset skips if needed when starting Flow State
        if (mode === 'FLOW_STATE') {
          get().resetSkipsIfNeeded();
        }
      },

      // End current session
      endSession: () => set({ currentSession: null }),

      // Track accounts worked
      incrementAccountsWorked: () => {
        const session = get().currentSession;
        if (session) {
          set({
            currentSession: {
              ...session,
              accountsWorked: session.accountsWorked + 1,
            },
          });
        }
      },

      // Use a skip (Flow State)
      useSkip: () => {
        const state = get();

        // Reset skips if hour has passed
        state.resetSkipsIfNeeded();

        if (state.flowStateSkipsRemaining <= 0) {
          return false;
        }

        const session = state.currentSession;
        set({
          flowStateSkipsRemaining: state.flowStateSkipsRemaining - 1,
          currentSession: session
            ? { ...session, skipsUsed: session.skipsUsed + 1 }
            : null,
        });

        return true;
      },

      // Reset skips if an hour has passed
      resetSkipsIfNeeded: () => {
        const resetAt = get().flowStateSkipsResetAt;
        const now = new Date();

        if (!resetAt || now >= new Date(resetAt)) {
          // Set reset time to 1 hour from now
          const nextReset = new Date(now.getTime() + 60 * 60 * 1000);
          set({
            flowStateSkipsRemaining: SKIPS_PER_HOUR,
            flowStateSkipsResetAt: nextReset,
          });
        }
      },

      // Get current skips remaining
      getSkipsRemaining: () => {
        get().resetSkipsIfNeeded();
        return get().flowStateSkipsRemaining;
      },
    }),
    {
      name: 'collector-preferences',
      // Only persist certain fields
      partialize: (state) => ({
        lastUsedMode: state.lastUsedMode,
        flowStateCountdownSeconds: state.flowStateCountdownSeconds,
        strategyModeShowAllQueue: state.strategyModeShowAllQueue,
        flowStateSkipsRemaining: state.flowStateSkipsRemaining,
        flowStateSkipsPerHour: state.flowStateSkipsPerHour,
        flowStateSkipsResetAt: state.flowStateSkipsResetAt,
      }),
    }
  )
);

/**
 * Hook for accessing collector preferences with convenience methods
 */
export const useCollectorPreferences = () => {
  const store = useCollectorPreferencesStore();

  return {
    // Current state
    currentSession: store.currentSession,
    isInSession: !!store.currentSession,
    currentMode: store.currentSession?.mode ?? null,
    lastUsedMode: store.lastUsedMode,

    // Flow State settings
    countdownSeconds: store.flowStateCountdownSeconds,
    skipsRemaining: store.getSkipsRemaining(),
    skipsPerHour: store.flowStateSkipsPerHour,

    // Strategy Mode settings
    showAllQueue: store.strategyModeShowAllQueue,

    // Session stats
    accountsWorkedThisSession: store.currentSession?.accountsWorked ?? 0,
    skipsUsedThisSession: store.currentSession?.skipsUsed ?? 0,

    // Actions
    startSession: store.startSession,
    endSession: store.endSession,
    incrementAccountsWorked: store.incrementAccountsWorked,
    useSkip: store.useSkip,
    setCountdown: store.setFlowStateCountdown,
    setShowAllQueue: store.setStrategyModeShowAllQueue,
  };
};
