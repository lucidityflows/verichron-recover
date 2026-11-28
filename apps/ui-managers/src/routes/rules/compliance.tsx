import { createFileRoute } from '@tanstack/react-router';
import { ComplianceHub } from '@/features/rules';

export const Route = createFileRoute('/rules/compliance')({
  component: ComplianceHub,
});