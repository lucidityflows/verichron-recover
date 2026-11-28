import React from 'react';
import { Toaster } from 'sonner';
import { Shield, Zap, Award, ArrowRight } from 'lucide-react';

/**
 * Centered Design - Uses ONLY theme colors
 */
export const AuthLayoutCentered: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen w-full bg-background relative overflow-hidden">
        {/* Decorative background using theme colors */}
        <div className="absolute inset-0">
          {/* Subtle gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-muted/30 via-background to-primary/5"></div>

          {/* Decorative blurred circles using theme colors */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-3xl"></div>

          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(to right, var(--color-border) 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-7xl">
            <div className="grid lg:grid-cols-12 gap-12 xl:gap-16 items-center">
              {/* Left Column - Branding & Features */}
              <div className="hidden lg:block lg:col-span-5 space-y-10">
                {/* Logo Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-primary/10 backdrop-blur-sm rounded-full border border-primary/20 shadow-sm">
                  <span className="text-sm font-semibold text-foreground">Verichron Inc.</span>
                </div>

                {/* Main Headline */}
                <div className="space-y-5">
                  <h1 className="text-5xl xl:text-6xl font-bold text-foreground leading-tight tracking-tight">
                    Verichron Recover
                  </h1>
                  <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                    Streamline operations and maximize recovery with intelligent automation and real-time insights.
                  </p>
                </div>

                {/* Feature Pills */}
                <div className="space-y-4 pt-2">
                  <div className="group relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 hover:bg-card/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"></div>
                    <div className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center border border-success/20 group-hover:border-success/40 transition-colors duration-300">
                      <Shield className="h-5 w-5 text-success" />
                    </div>
                    <div className="relative">
                      <div className="font-semibold text-foreground">Secure & Confidential</div>
                      <div className="text-sm text-muted-foreground">We prioritize protecting your personal information</div>
                    </div>
                  </div>

                  <div className="group relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 hover:bg-card/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"></div>
                    <div className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center border border-info/20 group-hover:border-info/40 transition-colors duration-300">
                      <Zap className="h-5 w-5 text-info" />
                    </div>
                    <div className="relative">
                      <div className="font-semibold text-foreground">Simple & Intuitive</div>
                      <div className="text-sm text-muted-foreground">Easy-to-use tools designed for your convenience</div>
                    </div>
                  </div>

                  <div className="group relative flex items-center gap-3 p-4 rounded-2xl transition-all duration-300 hover:bg-card/40">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"></div>
                    <div className="relative flex-shrink-0 w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20 group-hover:border-accent/40 transition-colors duration-300">
                      <Award className="h-5 w-5 text-accent" />
                    </div>
                    <div className="relative">
                      <div className="font-semibold text-foreground">24/7 Access</div>
                      <div className="text-sm text-muted-foreground">Manage your account whenever it works for you</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Auth Form */}
              <div className="lg:col-span-7">
                {/* Mobile Branding */}
                <div className="lg:hidden text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-3 border border-primary/20">
                    <span className="text-sm font-semibold text-foreground">Verichron Inc.</span>
                  </div>
                </div>

                {/* Form Card */}
                <div className="bg-card/80 border border-border/30 rounded-3xl shadow-xl backdrop-blur-xl p-8 lg:p-12">
                  {children}
                </div>

                {/* Footer Links */}
                <div className="mt-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Need help getting started?{' '}
                    <a href="#" className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors">
                      Contact our team
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
