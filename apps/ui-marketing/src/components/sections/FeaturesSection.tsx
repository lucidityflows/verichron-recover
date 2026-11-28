import { UserCheck, Building2, Shield, CheckCircle, Brain, Zap } from 'lucide-react';

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Tailored Features for Every Stakeholder
          </h2>
          <p className="text-xl text-muted-foreground">
            Specialized interfaces deliver precise tools for Collectors, Managers, and Debtors, all within a unified platform.
          </p>
        </div>

        {/* Command Center */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Command Center */}
          <div className="bg-gradient-to-br from-card/50 to-muted/50 p-6 rounded-xl border border-secondary/20 hover:border-secondary/40 hover:shadow-lg hover:shadow-secondary/10 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="h-8 w-8 text-secondary" />
              <h3 className="text-xl font-bold">Command Center</h3>
            </div>
            <ul className="space-y-3 text-muted-foreground">
              {[
                '<strong>Quiet Power:</strong> Strategic oversight without the noise.',
                '<strong>Settlement Matrix:</strong> Automated approval rules.',
                '<strong>Compliance Hub:</strong> Real-time risk monitoring.',
                '<strong>Portfolio ROI:</strong> Net recovery tracking & forecasting.'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm hover:text-foreground transition-colors">
                  <CheckCircle className="h-4 w-4 text-secondary flex-shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                </li>
              ))}
            </ul>
          </div>

          {/* Collector Workstation */}
          <div className="bg-gradient-to-br from-card/50 to-muted/50 p-6 rounded-xl border border-primary/20 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-primary" />
              <h3 className="text-xl font-bold">Collector Workstation</h3>
            </div>
            <ul className="space-y-3 text-muted-foreground">
              {[
                '<strong>Flow State:</strong> Distraction-free, keyboard-first interface.',
                '<strong>Smart Queue:</strong> AI-prioritized "next best action".',
                '<strong>Safety Net:</strong> Impossible to violate compliance rules.',
                '<strong>Micro-Wins:</strong> Gamified progress tracking.'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm hover:text-foreground transition-colors">
                  <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                </li>
              ))}
            </ul>
          </div>

          {/* Consumer Portal */}
          <div className="bg-gradient-to-br from-card/50 to-muted/50 p-6 rounded-xl border border-accent/20 hover:border-accent/40 hover:shadow-lg hover:shadow-accent/10 transition-all cursor-pointer">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck className="h-8 w-8 text-accent" />
              <h3 className="text-xl font-bold">Consumer Portal</h3>
            </div>
            <ul className="space-y-3 text-muted-foreground">
              {[
                '<strong>Self-Service:</strong> 24/7 payment and dispute resolution.',
                '<strong>Transparency:</strong> Clear balance and history view.',
                '<strong>Mobile First:</strong> Optimized for smartphone access.',
                '<strong>Direct Pay:</strong> Seamless, secure checkout experience.'
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm hover:text-foreground transition-colors">
                  <CheckCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
                  <span dangerouslySetInnerHTML={{ __html: feature }}></span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Advanced Capabilities */}
        <div className="bg-gradient-to-r from-card/50 to-muted/50 p-8 rounded-2xl border border-primary/20">
          <h3 className="text-2xl font-bold mb-6 text-center text-primary">Advanced Platform Capabilities</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Value Through Intelligence (VTI): AI-Native Features
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong>Value Through Intelligence (VTI)</strong>: Next-gen business insights and trend analysis</li>
                <li>• Automated compliance report generation and FDCPA guidance</li>
                <li>• Predictive analytics for collection optimization and strategy</li>
                <li>• ML-powered fraud detection, risk assessment, and behavioral scoring</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-secondary mb-3 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automation & Efficiency
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Streamlined debt validation and verification</li>
                <li>• Automated debtor communication workflows</li>
                <li>• Real-time balance and transaction tracking</li>
                <li>• Intelligent payment plan recommendations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
