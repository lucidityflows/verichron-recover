import { createFileRoute } from '@tanstack/react-router';
import { lazy } from 'react';
import { z } from 'zod';

const organizationDetailSearchSchema = z.object({
  tab: z.enum(['overview', 'audits', 'imports', 'integrations']).optional().catch('overview'),
});

const OrganizationDetailPage = lazy(() =>
  import('../features/organizations/index.js').then((m) => ({
    default: m.OrganizationDetailPage,
  }))
);

export const Route = createFileRoute('/organizations/$organizationId')({
  validateSearch: (search) => organizationDetailSearchSchema.parse(search),
  component: OrganizationDetailPage,
});
