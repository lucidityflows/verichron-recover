import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, ButtonVariant } from './Button.js';
import { formatErrorForLogging } from '../utils/errors.js';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', {
      error: formatErrorForLogging(error),
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full">
            <div className="bg-card border border-error/20 rounded-2xl p-8 shadow-xl">
              <div className="flex flex-col items-center text-center space-y-6">
                {/* Error Icon */}
                <div className="p-4 bg-error/10 rounded-full">
                  <AlertTriangle className="w-12 h-12 text-error" />
                </div>

                {/* Error Message */}
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-foreground">
                    Something went wrong
                  </h1>
                  <p className="text-muted-foreground">
                    We encountered an unexpected error. Please try refreshing the page.
                  </p>
                </div>

                {/* Error Details (in dev mode) */}
                {import.meta.env.DEV && (
                  <div className="w-full p-4 bg-muted/50 rounded-lg text-left">
                    <p className="text-xs font-mono text-error break-all">
                      {this.state.error.message}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={this.resetError}
                    variant={ButtonVariant.OUTLINE}
                    className="flex-1"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/'}
                    variant={ButtonVariant.PRIMARY}
                    className="flex-1"
                  >
                    Go Home
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
