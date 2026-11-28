import { createFileRoute } from '@tanstack/react-router';
import { WorkflowBuilder } from '@/features/strategy';

export const Route = createFileRoute('/strategy/workflows')({
  component: WorkflowBuilder,
});