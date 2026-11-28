import { createFileRoute } from '@tanstack/react-router';
import { AuditRequestCenter } from '@/features/auditing';

export const Route = createFileRoute('/auditing/requests')({
  component: AuditRequestCenter,
});
