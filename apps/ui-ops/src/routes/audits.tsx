import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AuditLogPage } from '../features/system/index.js';

const auditsSearchSchema = z.object({
  q: z.string().optional().catch(''),
  action: z.string().optional().catch(''),
  targetType: z.string().optional().catch(''),
  page: z.coerce.number().int().min(1).optional().catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().catch(50),
});

export const Route = createFileRoute('/audits')({
  validateSearch: (search) => auditsSearchSchema.parse(search),
  component: AuditLogPage,
});
