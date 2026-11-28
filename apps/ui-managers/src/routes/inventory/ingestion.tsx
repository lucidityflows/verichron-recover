import { createFileRoute } from '@tanstack/react-router';
import { IngestionCenter } from '@/features/inventory';

export const Route = createFileRoute('/inventory/ingestion')({
  component: IngestionCenter,
});