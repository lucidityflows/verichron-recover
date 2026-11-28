import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';

const Portfolios = lazy(() =>
  import('../features/portfolios/index.js').then((m) => ({
    default: m.Portfolios,
  }))
);

export const Route = createFileRoute('/portfolios')({
  component: Portfolios,
});
