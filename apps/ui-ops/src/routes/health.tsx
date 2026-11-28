import { createFileRoute } from '@tanstack/react-router';
import { System } from '../features/system/index.js';

export const Route = createFileRoute('/health')({
  component: System,
});
