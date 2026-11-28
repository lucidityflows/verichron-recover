import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const Debts = lazy(() =>
  import('../features/debts/index.js').then((m) => ({
    default: m.Debts,
  }))
);

export const Route = createFileRoute('/debts')({
  component: Debts,
});
