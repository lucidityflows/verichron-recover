import { createFileRoute } from '@tanstack/react-router';
import { GlobalSettings } from '@/features/rules';

export const Route = createFileRoute('/rules/settings')({
  component: GlobalSettings,
});