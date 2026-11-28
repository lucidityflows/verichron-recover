import { createFileRoute } from '@tanstack/react-router';
import { PortfolioAnalytics } from '@/features/inventory/PortfolioAnalytics';

export const Route = createFileRoute('/inventory/portfolios/$portfolioId')({
  component: PortfolioAnalytics,
});
