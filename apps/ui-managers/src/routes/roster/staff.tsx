import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/roster/staff')({
  component: () => <Outlet />,
});