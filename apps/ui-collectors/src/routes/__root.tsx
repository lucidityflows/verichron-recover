import { Outlet, createRootRoute } from '@tanstack/react-router';
import { CollectorLayout } from '@/app/layouts/CollectorLayout';

export const Route = createRootRoute({
  component: () => (
    <CollectorLayout>
      <Outlet />
    </CollectorLayout>
  ),
});
