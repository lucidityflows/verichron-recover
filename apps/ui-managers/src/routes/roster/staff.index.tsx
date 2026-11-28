import { createFileRoute } from '@tanstack/react-router';
import { StaffDirectory } from '@/features/roster';

export const Route = createFileRoute('/roster/staff/')({
  component: StaffDirectory,
});