import { createFileRoute } from '@tanstack/react-router';
import { CommunicationHub } from '@/features/rules';

export const Route = createFileRoute('/rules/communications')({
  component: CommunicationHub,
});
