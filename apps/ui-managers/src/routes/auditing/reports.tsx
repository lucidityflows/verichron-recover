import { createFileRoute } from '@tanstack/react-router';
import { ReportsCenter } from '@/features/auditing';

export const Route = createFileRoute('/auditing/reports')({
  component: ReportsCenter,
});
