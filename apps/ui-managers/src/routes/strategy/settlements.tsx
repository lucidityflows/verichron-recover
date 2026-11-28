import { createFileRoute } from '@tanstack/react-router';
import { SettlementStrategyBuilder } from '@/features/strategy';

export const Route = createFileRoute('/strategy/settlements')({
  component: SettlementStrategyBuilder,
});