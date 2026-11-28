import { createFileRoute } from '@tanstack/react-router';
import ForgotPassword from '../features/auth/ForgotPassword';

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPassword,
});
