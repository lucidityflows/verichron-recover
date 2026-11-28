import { Database, CheckCircle, ArrowRight } from 'lucide-react';
import { scrollToSection } from '../../utils/scrollTo.js';

export const PlatformSection = () => {
  return (
    <section id="platform" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Three Specialized Interfaces. One Unified Solution.
          </h2>
          <p className="text-xl text-muted-foreground">
            Precision tools designed for the unique needs of Managers, Collectors, and Consumers.
          </p>
        </div>

        {/* Platform Overview Card */}
        <div className="mb-16">
          <div className="bg-gradient-to-r from-card/80 to-muted/80 p-8 md:p-12 rounded-3xl border border-primary/20 hover:border-primary/40 transition-all backdrop-blur-sm">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-4 justify-center">
                <Database className="h-10 w-10 text-primary" />
                <h3 className="text-3xl font-bold text-foreground text-center">Cohesive Product Architecture</h3>
              </div>
              <p className="text-muted-foreground mb-8 leading-relaxed text-center text-lg">
                We've moved beyond the "one-size-fits-all" dashboard. Verichron Inc. delivers three purpose-built applications that share a single, real-time nervous system. Whether you are strategizing portfolio ROI, negotiating a settlement, or paying off a debt, the interface is optimized for <strong>your</strong> specific success.
              </p>
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-4 mb-8">
                {[
                  '<strong>Command Center:</strong> Accelerate onboarding using Vertex AI for intelligent portfolio mapping—always keeping you in the loop. Effortlessly manage and customize dunning sequences to ensure compliant, strategic execution.',
                  '<strong>Collector Workstation:</strong> Empower your team with two distinct work modes: "Flow State" for high-velocity, keyboard-first execution, and "Strategy Mode" for deep-dive profile analysis.',
                  '<strong>Consumer Portal:</strong> Frictionless, mobile-first self-service for modern debtors.',
                  '<strong>Real-Time Event Bus:</strong> Instant synchronization across all three interfaces.',
                  '<strong>AI-Native Intelligence:</strong> Predictive scoring and automated compliance guardrails.',
                  '<strong>Enterprise Security:</strong> Role-based access and audit-ready architecture.'
                ].map((feature, i) => (
                  <div key={i} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  disabled
                  className="px-6 py-3 bg-primary/20 text-primary border border-primary/30 rounded-lg font-semibold transition-all flex items-center gap-2 cursor-not-allowed opacity-70"
                >
                  Demo Coming Soon
                </button>
                <button
                  onClick={() => scrollToSection('features')}
                  className="px-6 py-3 border border-primary hover:bg-primary/10 rounded-lg font-semibold transition-all"
                >
                  Explore Features
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
