/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing */
import React, { useState } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { Button } from '../../components/Button';
import { Card, CardVariant } from '../../components/Card';
import { PasswordInput } from '../../components/PasswordInput';
import { Input } from '../../components/Input';
import { toast } from 'sonner';
import { Route as ResetPasswordRoute } from '../../routes/reset-password/$token.js';
// TODO: Implement reset password backend integration
// See MVP-GAPS.md - Gap #4: Reset Password Flow Backend
//
// Required:
// 1. Add authService.resetPassword() method in src/services/authService.ts
// 2. Backend endpoint: POST /auth/reset-password in api-users
// 3. Token validation and expiration checking
// 4. Password update and token invalidation
//
// Implementation:
// import { resetPassword } from '@/services/authService';
// const response = await resetPassword(token, password);
//
// Expected response: { message: 'Password reset successfully' }
// Possible errors: Token expired, Token invalid, Token already used

function ResetPassword() {
  // Use the Route's useParams hook directly for type safety
  const { token } = useParams({ from: ResetPasswordRoute.id });
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!token) {
      toast.error('Reset token is missing.');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Replace simulation with actual API call
      // await resetPassword(token, password);
      console.log('Reset password request with token:', token);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      toast.success('Your password has been reset successfully. Please log in.');
      void navigate({ to: '/login' }); // Redirect to login page
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password.');
      console.error('Reset password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card variant={CardVariant.GLASS} className="animate-fade-in-up">
        <form className="space-y-6" onSubmit={(e) => { void handleSubmit(e); }}>
          <div className="space-y-1 text-center pb-4">
            <h2 className="text-2xl font-bold text-foreground">Set new password</h2>
            <p className="text-sm text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          <PasswordInput
            label="New Password"
            name="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="Enter your new password"
            showStrengthIndicator={true}
            required
          />

          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            error={
              confirmPassword && password !== confirmPassword
                ? 'Passwords do not match'
                : undefined
            }
            required
          />

          <Button
            type="submit"
            className="w-full"
            loading={isLoading}
            loadingText="Resetting password..."
          >
            Reset Password
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border/50 text-center">
          <Link
            to="/login"
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </Card>
    </>
  );
}

export default ResetPassword;