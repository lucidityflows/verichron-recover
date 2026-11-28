import { createFileRoute } from '@tanstack/react-router';
import { PerformanceCoaching } from '@/features/roster';

export const Route = createFileRoute('/roster/coaching')({
  component: PerformanceCoaching,
});