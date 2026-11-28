import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const SandboxPage = lazy(() =>
  import('../features/sandbox/index.js').then((m) => ({
    default: m.SandboxPage,
  }))
);

export const Route = createFileRoute('/sandbox')({
  component: SandboxPage,
});
