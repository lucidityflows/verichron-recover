import { createFileRoute } from '@tanstack/react-router';
import { EscalationInbox } from '@/features/pulse';

export const Route = createFileRoute('/escalations')({
  component: EscalationInbox,
});
