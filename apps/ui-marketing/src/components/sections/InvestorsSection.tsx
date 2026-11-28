import { TrendingUp, BarChart3, Building2, Brain, CheckCircle, Users, Briefcase } from 'lucide-react';
import { scrollToSection } from '../../utils/scrollTo.js';

export const InvestorsSection = () => {
  return (
    <section id="investors" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Strategic Partnership Opportunities
          </h2>
          <p className="text-xl text-muted-foreground">Partner with Verichron Inc. to redefine the future of debt management</p>
        </div>

        {/* Market Opportunity & Competitive Advantages */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-gradient-to-br from-card/50 to-muted/50 p-8 rounded-2xl border border-primary/20">
            <h3 className="text-2xl font-bold mb-4 text-primary">Market Impact & Collaboration</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Transforming the $16+ billion US debt collection industry</span>
              </li>
              <li className="flex items-start gap-2">
                <BarChart3 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Addressing critical needs in a fragmented, legacy-dominated market</span>
              </li>
              <li className="flex items-start gap-2">
                <Building2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Navigating increasing regulatory compliance demands together</span>
              </li>
              <li className="flex items-start gap-2">
                <Brain className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Driving digital transformation through AI-native innovation</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-card/50 to-muted/50 p-8 rounded-2xl border border-secondary/20">
            <h3 className="text-2xl font-bold mb-4 text-secondary">Competitive Advantages</h3>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                <span>First comprehensive multi-stakeholder platform</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                <span>AI-native architecture from ground up</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                <span>Founder with deep domain expertise</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-secondary flex-shrink-0 mt-0.5" />
                <span>Advanced-stage development with working platform</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Seeking Strategic Partners */}
        <div className="bg-gradient-to-r from-card/80 to-muted/80 p-8 rounded-2xl border border-primary/20">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4">Seeking Visionary Alpha Partners</h3>
            <p className="text-muted-foreground">
              We are actively seeking visionary organizations and talented individuals to join us as strategic partners in shaping the next generation of debt management technology.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-foreground" />
              </div>
              <h4 className="font-semibold mb-2">Alpha Partnership for Market Leadership</h4>
              <p className="text-sm text-muted-foreground">Influence product roadmap and gain early competitive advantage</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-foreground" />
              </div>
              <h4 className="font-semibold mb-2">Collaborative Development with Experts</h4>
              <p className="text-sm text-muted-foreground">Work hand-in-hand with our team to customize solutions</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-8 w-8 text-foreground" />
              </div>
              <h4 className="font-semibold mb-2">Strategic Alliances for Industry Impact</h4>
              <p className="text-sm text-muted-foreground">Leverage our platform to drive mutual growth and innovation</p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => scrollToSection('contact')}
              className="px-8 py-3 bg-gradient-to-r from-primary to-secondary rounded-lg font-semibold hover:from-primary/90 hover:to-secondary/90 transition-all transform hover:scale-105 shadow-lg hover:shadow-primary/25"
            >
              Schedule Discussion
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
