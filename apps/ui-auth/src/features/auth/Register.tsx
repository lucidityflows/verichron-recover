/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing */
import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Mail, User } from 'lucide-react';
import { Button, ButtonSize, ButtonVariant } from '../../components/Button';
import { Input } from '../../components/Input';
import { PasswordInput } from '../../components/PasswordInput';
import { Checkbox } from '../../components/Checkbox';
import { Card } from '../../components/Card';
import { toast } from 'sonner';

function Register() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!formData.agreeToTerms) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Implement registration backend integration
      // See MVP-GAPS.md - Gap #2: Registration Flow Backend
      //
      // Required:
      // 1. Add authService.register() method in src/services/authService.ts
      // 2. Backend endpoint: POST /auth/register in api-users
      // 3. Email verification flow (send confirmation email)
      //
      // Implementation:
      // const response = await authService.register({
      //   email: formData.email,
      //   password: formData.password,
      //   firstName: formData.firstName,
      //   lastName: formData.lastName
      // });
      //
      // Expected response: { message: 'Please check your email to verify your account' }
      // Then redirect to email verification instructions page
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate registration API call

      toast.success('Account created successfully! Please sign in.');
      void navigate({ to: '/login' });
    } catch (error: any) {
      toast.error(error.message || 'Registration failed. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData(prev => ({
      ...prev,
      [e.target.name]: value
    }));
  };

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-foreground">Create your account</h1>
        <p className="text-base text-muted-foreground">Join Verichron today</p>
      </div>
      <Card className="p-8">
        <form className="space-y-8" onSubmit={(e) => { void handleSubmit(e); }}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="John"
              icon={<User className="h-4 w-4" />}
              required
            />
            <Input
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Doe"
              icon={<User className="h-4 w-4" />}
              required
            />
          </div>

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@company.com"
            icon={<Mail className="h-4 w-4" />}
            required
          />

          <PasswordInput
            label="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            showStrengthIndicator={true}
            required
          />

          <PasswordInput
            label="Confirm Password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            error={
              formData.confirmPassword && formData.password !== formData.confirmPassword
                ? 'Passwords do not match'
                : undefined
            }
            required
          />
        </div>

        <div className="space-y-4">
          <Checkbox
            id="agree-terms"
            name="agreeToTerms"
            checked={formData.agreeToTerms}
            onChange={handleChange}
            label={
              <span className="text-sm">
                I agree to the{' '}
                <span className="text-primary font-semibold hover:underline cursor-pointer">
                  Terms of Service
                </span>
                {' '}and{' '}
                <span className="text-primary font-semibold hover:underline cursor-pointer">
                  Privacy Policy
                </span>
              </span>
            }
            required
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          size={ButtonSize.LG}
          loading={isLoading}
          loadingText="Creating account..."
        >
          Create Account
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-card text-muted-foreground">
              Already have an account?
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
            Sign in
          </Button>
        </Link>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Your data is secure and encrypted
        </p>
      </div>
      </Card>
    </div>
  );
}

export default Register;
