import { createFileRoute } from '@tanstack/react-router';
import { ControlTower } from '@/features/pulse';

export const Route = createFileRoute('/')({
  component: ControlTower,
});