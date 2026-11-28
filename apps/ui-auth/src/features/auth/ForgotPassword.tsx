/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing */
import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button, ButtonSize, ButtonVariant } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { toast } from 'sonner';
// TODO: Implement forgot password backend integration
// See MVP-GAPS.md - Gap #3: Forgot Password Flow Backend
//
// Required:
// 1. Add authService.forgotPassword() method in src/services/authService.ts
// 2. Backend endpoint: POST /auth/forgot-password in api-users
// 3. Email service to send password reset link
//
// Implementation:
// import { forgotPassword } from '@/services/authService';
// const response = await forgotPassword(email);
//
// Backend should always return success (security: don't reveal if email exists)
// Expected response: { message: 'If the email exists, a reset link has been sent' }

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // TODO: Replace simulation with actual API call
      // await forgotPassword(email);
      console.log('Forgot password request for:', email);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      setIsSubmitted(true);
      toast.success('If an account with that email exists, a password reset link has been sent.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send password reset link.');
      console.error('Forgot password error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-8">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-bold text-foreground">Check your email</h1>
          <p className="text-base text-muted-foreground">We've sent you a password reset link</p>
        </div>
        <Card className="p-8">
          <div className="text-center space-y-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/20">
                <CheckCircle className="h-10 w-10 text-green-600" strokeWidth={2} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-base text-muted-foreground max-w-sm mx-auto">
              If an account with <span className="font-semibold text-foreground">{email}</span> exists,
              we've sent a password reset link to it.
            </p>
            <p className="text-sm text-muted-foreground">
              Please check your inbox and spam folder.
            </p>
          </div>

          <div className="space-y-3">
            <Link to="/login" className="block">
              <Button className="w-full" size={ButtonSize.LG}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </Link>
            <button
              onClick={() => setIsSubmitted(false)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Try a different email
            </button>
          </div>
        </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-foreground">Forgot your password?</h1>
        <p className="text-base text-muted-foreground">No problem, we'll send you reset instructions</p>
      </div>
      <Card className="p-8">
        <form className="space-y-8" onSubmit={(e) => { void handleSubmit(e); }}>
        <div className="space-y-6">
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="you@company.com"
            icon={<Mail className="h-4 w-4" />}
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size={ButtonSize.LG}
          loading={isLoading}
          loadingText="Sending reset link..."
        >
          Send Reset Link
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-card text-muted-foreground">
              Remember your password?
            </span>
          </div>
        </div>

        <Link to="/login">
          <Button
            type="button"
            variant={ButtonVariant.OUTLINE}
            className="w-full"
            size={ButtonSize.LG}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </Link>
      </form>
      </Card>
    </div>
  );
}

export default ForgotPassword;
