import { createRootRoute } from '@tanstack/react-router';
import { RootLayout } from '@/app/layouts/RootLayout';
import { NotFound } from '@/shared/components/NotFound';

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});
