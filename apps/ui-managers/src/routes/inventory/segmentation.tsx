import { createFileRoute } from '@tanstack/react-router';
import { PortfolioSegmentation } from '@/features/inventory';

export const Route = createFileRoute('/inventory/segmentation')({
  component: PortfolioSegmentation,
});