import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const UsersPage = lazy(() =>
  import('../features/users/index.js').then((m) => ({
    default: m.UsersPage,
  }))
);

export const Route = createFileRoute('/users')({
  component: UsersPage,
});
