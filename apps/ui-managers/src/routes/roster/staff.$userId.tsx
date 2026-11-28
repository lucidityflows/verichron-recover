import { createFileRoute } from '@tanstack/react-router';
import { StaffProfile } from '@/features/roster/StaffProfile';

export const Route = createFileRoute('/roster/staff/$userId')({
  component: StaffProfile,
});
