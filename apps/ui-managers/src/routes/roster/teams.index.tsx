import { createFileRoute } from '@tanstack/react-router';
import { ResourceOptimizer } from '@/features/roster';

export const Route = createFileRoute('/roster/teams/')({
  component: ResourceOptimizer,
});