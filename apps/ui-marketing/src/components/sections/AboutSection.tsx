export const AboutSection = () => {
  return (
    <section id="about" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            About Verichron Inc.
          </h2>
          <p className="text-xl text-muted-foreground">
            Leading the next wave of debt management innovation, seeking alpha partners for transformative solutions in Q1 2026.
          </p>
        </div>

        {/* Mission & Market Cards */}
        <div className="grid md:grid-cols-2 gap-12">
          <div className="bg-gradient-to-br from-card/50 to-muted/50 p-8 rounded-2xl border border-primary/20 hover:border-primary/40 transition-all">
            <h3 className="text-2xl font-bold mb-4 text-primary">Our Mission</h3>
            <p className="text-muted-foreground leading-relaxed">
              We are redefining the $16+ billion debt collection industry by replacing chaos with <strong>Quiet Power</strong>. Our mission is to provide a platform where managers have absolute strategic control and collectors can work in a protected <strong>Flow State</strong>, ensuring compliance and maximizing recovery through intelligent design.
            </p>
          </div>

          <div className="bg-gradient-to-br from-card/50 to-muted/50 p-8 rounded-2xl border border-secondary/20 hover:border-secondary/40 transition-all">
            <h3 className="text-2xl font-bold mb-4 text-secondary">Market Opportunity</h3>
            <p className="text-muted-foreground leading-relaxed">
              The industry is paralyzed by outdated software and notification fatigue. We are capturing this market by delivering the first true <strong>Operating System for Debt Recovery</strong>—featuring a dedicated <strong>Command Center</strong> for decision-makers and a distraction-free <strong>Workstation</strong> for agents, driving efficiency that legacy systems cannot match.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '$16B+', label: 'Industry Impact' },
            { value: 'Multi-Tenant', label: 'Enterprise Architecture' },
            { value: 'AI-Native', label: 'Platform Design' },
            { value: 'Secure', label: 'Enterprise Security' }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-muted-foreground mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
