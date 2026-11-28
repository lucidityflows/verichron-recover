import { createFileRoute } from '@tanstack/react-router';
import { ActivateAccount } from '../features/auth/ActivateAccount.js';

export const Route = createFileRoute('/activate/$token')({
  component: ActivateAccount,
});
