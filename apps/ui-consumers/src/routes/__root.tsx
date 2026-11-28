import React, { Suspense } from 'react';
import { createRootRoute } from '@tanstack/react-router';
import { ConsumerLayout } from '../app/layouts/ConsumerLayout.js';
import { AuthGuard } from '../shared/components/AuthGuard.js';

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
    <AuthGuard>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            Loading...
          </div>
        }
      >
        <ConsumerLayout />
      </Suspense>
      {/* Render router devtools in development */}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <TanStackRouterDevtoolsLazy />
        </Suspense>
      )}
    </AuthGuard>
  ),
});
