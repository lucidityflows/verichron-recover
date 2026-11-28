import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const communicationsSearchSchema = z.object({
  tab: z.enum(['logs', 'templates', 'compose']).optional().catch('logs'),
});

const CommunicationsHubPage = lazy(() =>
  import('../features/communications/index.js').then((m) => ({
    default: m.CommunicationsHubPage,
  }))
);

export const Route = createFileRoute('/communications')({
  validateSearch: (search) => communicationsSearchSchema.parse(search),
  component: CommunicationsHubPage,
});
