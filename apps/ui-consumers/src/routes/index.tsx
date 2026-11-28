import { createFileRoute } from '@tanstack/react-router';
import { DashboardPage } from '../features/dashboard/index.js';

export const Route = createFileRoute('/')({
  component: DashboardPage,
});
