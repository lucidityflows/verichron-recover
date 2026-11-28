import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const CreditorsPage = lazy(() =>
  import('../features/creditors/index.js').then((m) => ({
    default: m.CreditorsPage,
  }))
);

export const Route = createFileRoute('/creditors')({
  component: CreditorsPage,
});
