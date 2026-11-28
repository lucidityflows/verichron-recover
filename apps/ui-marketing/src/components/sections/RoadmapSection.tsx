import { Shield } from 'lucide-react';

export const RoadmapSection = () => {
  const roadmapItems = [
    {
      quarter: '2025 Q3-Q4',
      title: 'Core Platform Development',
      desc: 'Architectural foundation and core development of the Verichron Recover platform, establishing secure, event-driven workflows.',
      status: 'completed',
      highlight: false,
    },
    {
      quarter: '2026 Q1',
      title: 'Alpha Recruitment & Onboarding',
      desc: 'Strategic partner selection and onboarding for the pilot program. Finalizing deployment configurations for early adopters.',
      status: 'active',
      highlight: true,
    },
    {
      quarter: '2026 Q2',
      title: 'Alpha Pilot Launch',
      desc: 'Live deployment of Manager Command Center and Collector Workstation. Intensive feedback loops with strategic partners.',
      status: 'upcoming',
    },
    {
      quarter: '2026 Q4',
      title: 'Beta Expansion',
      desc: 'Broader release incorporating VTI capabilities and advanced automation. System hardening and performance optimization.',
      status: 'upcoming',
    },
    {
      quarter: '2027 Q1',
      title: 'Commercial Launch',
      desc: 'Full platform availability including the Debtor Self-Service portal. Enterprise-grade scalability and comprehensive support launch.',
      status: 'upcoming',
    },
  ];

  return (
    <section id="roadmap" className="py-12 sm:py-16 md:py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent px-2">
            Development Roadmap
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground px-4">Our path from development to market launch</p>
        </div>

        {/* Current Status Badge */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-accent/30 to-secondary/30 rounded-full border border-primary/30 mb-6 sm:mb-8">
            <Shield className="h-4 w-4 text-warning flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-center">Currently: Alpha Recruitment & Onboarding (Q1 2026)</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative max-w-4xl mx-auto">
          {/* Vertical Line - Hidden on mobile */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-gradient-to-b from-primary to-secondary"></div>

          {roadmapItems.map((item, i) => (
            <div
              key={i}
              className={`relative flex items-center mb-8 sm:mb-12 ${
                i % 2 === 0 ? 'md:justify-start' : 'md:justify-end'
              }`}
            >
              <div className={`w-full md:w-5/12 ${i % 2 === 0 ? 'md:text-right md:pr-8' : 'md:text-left md:pl-8'}`}>
                <div
                  className={`bg-gradient-to-br from-card to-muted p-4 sm:p-6 rounded-xl border ${
                    item.highlight
                      ? 'border-primary shadow-lg shadow-primary/20'
                      : item.status === 'upcoming'
                      ? 'border-primary'
                      : 'border-border'
                  } hover:border-primary/50 transition-all`}
                >
                  <div
                    className={`text-xs sm:text-sm font-semibold mb-1 ${
                      item.highlight
                        ? 'text-primary'
                        : item.status === 'upcoming'
                        ? 'text-primary'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {item.quarter}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
                  {item.highlight && (
                    <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-primary/40 rounded text-xs text-foreground font-medium">
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                      Next Milestone
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline Dot - Hidden on mobile */}
              <div
                className={`hidden md:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 ${
                  item.highlight
                    ? 'bg-primary'
                    : item.status === 'upcoming'
                    ? 'bg-primary'
                    : 'bg-gradient-to-br from-secondary to-accent'
                } rounded-full border-4 border-background`}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};