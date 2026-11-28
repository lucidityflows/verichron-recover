import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const OrganizationsPage = lazy(() =>
  import('../features/organizations/index.js').then((m) => ({
    default: m.OrganizationsPage,
  }))
);

export const Route = createFileRoute('/organizations/')({
  component: OrganizationsPage,
});