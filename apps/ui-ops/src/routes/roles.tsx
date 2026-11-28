import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const RolesPage = lazy(() =>
  import('../features/roles/index.js').then((m) => ({
    default: m.RolesPage,
  }))
);

export const Route = createFileRoute('/roles')({
  component: RolesPage,
});
