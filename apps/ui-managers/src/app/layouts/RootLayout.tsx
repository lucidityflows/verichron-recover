import React from 'react';
import { Outlet } from '@tanstack/react-router';
import { Sidebar } from '@/shared/components/Sidebar';
import { Header } from '@/shared/components/Header';

/**
 * RootLayout provides the basic structure for the application.
 * It is built with a mobile-first approach and a "Quiet Power" ERP vibe.
 */
export const RootLayout: React.FC = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground selection:bg-primary/10">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 custom-scrollbar">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};