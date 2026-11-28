import { createFileRoute } from '@tanstack/react-router';
import { ComplianceMonitoringDashboard } from '@/features/rules';

export const Route = createFileRoute('/rules/compliance-monitoring')({
  component: ComplianceMonitoringDashboard,
});
