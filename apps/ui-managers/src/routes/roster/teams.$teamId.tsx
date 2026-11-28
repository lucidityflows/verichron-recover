import { createFileRoute } from '@tanstack/react-router';
import { TeamDetail } from '@/features/roster';

export const Route = createFileRoute('/roster/teams/$teamId')({
  component: TeamDetailRouteComponent,
});

function TeamDetailRouteComponent() {
  const { teamId } = Route.useParams();
  const navigate = Route.useNavigate();

  return <TeamDetail teamId={teamId} onBack={() => navigate({ to: '/roster/teams' })} />;
}