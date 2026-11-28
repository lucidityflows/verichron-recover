import { createFileRoute } from '@tanstack/react-router';
import { PortfolioROIDashboard } from '@/features/inventory';

export const Route = createFileRoute('/inventory/portfolios/')({
  component: PortfolioROIDashboard,
});