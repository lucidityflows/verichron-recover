import { createFileRoute } from '@tanstack/react-router';
import { AuditTrailViewer } from '@/features/auditing';

export const Route = createFileRoute('/auditing/logs')({
  component: AuditTrailViewer,
});
