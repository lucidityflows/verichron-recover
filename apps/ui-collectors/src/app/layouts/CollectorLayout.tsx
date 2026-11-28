import React from 'react';
import { HotkeysProvider } from '@/shared/contexts/HotkeysContext';
import { RealtimeProvider } from '@/shared/contexts/RealtimeContext';
import { TeamProvider } from '@/shared/contexts/TeamContext';
import { Toaster } from 'sonner';
import { SoftPhone } from '@/shared/components/SoftPhone';

/**
 * CollectorLayout
 * Primary layout for the Flow State Workstation
 *
 * Philosophy: "Graceful Elegance" - Minimal chrome, maximum focus
 * - No heavy navigation bars
 * - No cluttered sidebars (unless actively needed)
 * - Full-screen workspace for collectors
 * - Keyboard-first interaction
 */
export const CollectorLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <HotkeysProvider>
      <TeamProvider>
        <RealtimeProvider>
          <div className="min-h-screen bg-background text-foreground">
            {children}
          </div>
          <SoftPhone />
          <Toaster position="top-right" richColors />
        </RealtimeProvider>
      </TeamProvider>
    </HotkeysProvider>
  );
};
