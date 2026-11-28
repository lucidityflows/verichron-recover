import { createFileRoute } from '@tanstack/react-router';
import { CreditorMaster } from '@/features/inventory';

export const Route = createFileRoute('/inventory/creditors')({
  component: CreditorMaster,
});