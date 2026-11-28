import React, { Suspense } from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AdminLayout } from '../app/layouts/AdminLayout.js';
// import { LoadingSpinner } from '@verichron/ui-components'; // Deprecated

// Create a lazy-loaded component for devtools
const TanStackRouterDevtoolsLazy = import.meta.env.DEV
  ? React.lazy(() =>
      import('@tanstack/react-router-devtools').then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    )
  : () => null;

export const Route = createRootRoute({
  component: () => (
    <AdminLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            Loading...
          </div>
        }
      >
        <Outlet />
      </Suspense>
      {/* Render router devtools in development */}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <TanStackRouterDevtoolsLazy />
        </Suspense>
      )}
    </AdminLayout>
  ),
});
