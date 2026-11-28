import { ChevronDown, Shield, Eye } from 'lucide-react';
import { scrollToSection } from '../../utils/scrollTo.js';

export const HeroSection = () => {
  return (
    <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20" />
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1000ms' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-24 md:pt-0">
        {/* Status Badge */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/30 rounded-full border border-accent/30 mb-6">
            <Shield className="h-4 w-4 text-warning" />
            <span className="text-sm text-warning font-medium">Currently: Alpha Recruitment & Onboarding (Q1 2026)</span>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            The Operating System
          </span>
          <br />
          <span className="text-foreground">for Modern Debt Recovery</span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-4xl mx-auto">
          Empower your organization with <strong>Quiet Power</strong> for managers and <strong>Flow State</strong> for collectors. A unified platform delivering strategic control, distraction-free execution, and seamless debtor self-service.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={() => scrollToSection('platform')}
            className="px-8 py-4 bg-gradient-to-r from-primary to-secondary rounded-lg font-semibold hover:from-primary/90 hover:to-secondary/90 transition-all transform hover:scale-105 shadow-lg hover:shadow-primary/25"
          >
            Learn About Platform
          </button>
          <button
            onClick={() => scrollToSection('alpha')}
            className="px-8 py-4 border border-primary rounded-lg font-semibold hover:bg-primary/10 hover:border-primary/80 transition-all"
          >
            Apply for Alpha Program Q1 2026
          </button>
        </div>

        {/* Demo Link - Coming Soon */}
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="h-4 w-4" />
          <span>Interactive Demo Environment</span>
          <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-[10px] font-bold uppercase tracking-wider">Coming Soon</span>
          <span className="text-xs italic ml-1">Available Late Jan 2026</span>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <button
          onClick={() => scrollToSection('about')}
          className="text-primary hover:text-primary/80 transition-colors cursor-pointer"
        >
          <ChevronDown className="h-8 w-8" />
        </button>
      </div>
    </section>
  );
};
