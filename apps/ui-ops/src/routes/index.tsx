import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const DashboardPage = lazy(() =>
  import('../features/dashboard/index.js').then((m) => ({
    default: m.DashboardPage,
  }))
);

export const Route = createFileRoute('/')({
  component: DashboardPage,
});
