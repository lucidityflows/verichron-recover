import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const Settings = lazy(() =>
  import('../features/settings/index.js').then((m) => ({
    default: m.Settings,
  }))
);

export const Route = createFileRoute('/settings')({
  component: Settings,
});
