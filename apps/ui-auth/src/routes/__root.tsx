import React, { Suspense } from 'react';
import { createRootRoute, Outlet } from '@tanstack/react-router';
import { AuthLayoutCentered } from '../components/layouts/AuthLayoutCentered';


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
    <>
      <AuthLayoutCentered>
        <Outlet />
      </AuthLayoutCentered>
      {/* Render router devtools in development */}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <TanStackRouterDevtoolsLazy />
        </Suspense>
      )}
    </>
  ),
});
