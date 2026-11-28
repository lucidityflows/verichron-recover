import { Cloud, Lock, Server, Activity, Brain, FileText, Database, Users, CreditCard, MessageSquare, Building2, History, Workflow, BarChart } from 'lucide-react';

export const ArchitectureSection = () => {
  const architectureFeatures = [
    {
      icon: Cloud,
      title: 'Cloud Native',
      desc: 'Microservices architecture with independent scaling, load balancing, and container orchestration'
    },
    {
      icon: Lock,
      title: 'Security First',
      desc: 'End-to-end encryption, RBAC, service isolation with comprehensive audit trails and event-driven security'
    },
    {
      icon: Server,
      title: 'Event-Driven',
      desc: 'GCP Pub/Sub messaging for asynchronous communication, ensuring loose coupling and system resilience'
    },
    {
      icon: Activity,
      title: 'Real-time Analytics',
      desc: 'Live dashboard metrics, performance tracking, and predictive business intelligence aggregation'
    },
    {
      icon: Brain,
      title: 'AI Integration',
      desc: 'Native machine learning for insights, automation, and intelligent decision support across services'
    },
    {
      icon: FileText,
      title: 'Compliance Framework',
      desc: 'Built to support major regulatory frameworks like FDCPA and GDPR with auditable event logs'
    }
  ];

  const microservices = [
    {
      icon: Users,
      name: 'Users & Authentication',
      desc: 'Identity management, JWT-based auth, RBAC, and two-layered authorization',
      color: 'primary'
    },
    {
      icon: History,
      name: 'Debt Management',
      desc: 'Portfolio tracking, debt lifecycle, chain of title, and bulk import processing',
      color: 'secondary'
    },
    {
      icon: Database,
      name: 'Debtor Profiles',
      desc: 'Contact management, demographics, verification workflows, and document storage',
      color: 'accent'
    },
    {
      icon: CreditCard,
      name: 'Transactions',
      desc: 'Payment processing, payment plans, gateway abstraction, and financial records',
      color: 'success'
    },
    {
      icon: Building2,
      name: 'Organizations',
      desc: 'Tenant management, onboarding, settings, and high-level analytics aggregation',
      color: 'warning'
    },
    {
      icon: MessageSquare,
      name: 'Communications',
      desc: 'Template management, multi-channel dispatch, compliance tracking, and audit logs',
      color: 'info'
    },
    {
      icon: Workflow,
      name: 'Workflows & Automations',
      desc: 'Compliance engine, rule execution, and automated dunning sequence orchestration',
      color: 'purple'
    },
    {
      icon: BarChart,
      name: 'Analytics',
      desc: 'Portfolio performance, operational metrics, and visualized business insights',
      color: 'orange'
    }
  ];

  const colorStyles = {
    primary: {
      border: 'border-primary/20 hover:border-primary/40',
      text: 'text-primary',
    },
    secondary: {
      border: 'border-secondary/20 hover:border-secondary/40',
      text: 'text-secondary',
    },
    accent: {
      border: 'border-accent/20 hover:border-accent/40',
      text: 'text-accent',
    },
    success: {
      border: 'border-success/20 hover:border-success/40',
      text: 'text-success',
    },
    warning: {
      border: 'border-warning/20 hover:border-warning/40',
      text: 'text-warning',
    },
    info: {
      border: 'border-info/20 hover:border-info/40',
      text: 'text-info',
    },
    purple: {
      border: 'border-purple-500/20 hover:border-purple-500/40',
      text: 'text-purple-500',
    },
    orange: {
      border: 'border-orange-500/20 hover:border-orange-500/40',
      text: 'text-orange-500',
    },
  };

  const techStack = [
    {
      category: 'Frontend',
      techs: ['React 19', 'TypeScript', 'TanStack Router', 'Tailwind CSS v4']
    },
    {
      category: 'Backend',
      techs: ['NestJS', 'Node.js', 'PostgreSQL', 'MongoDB', 'Redis']
    },
    {
      category: 'AI/Analytics',
      techs: ['Machine Learning', 'Business Intelligence', 'Predictive Models', 'Custom Reports']
    },
    {
      category: 'Infrastructure',
      techs: ['Docker', 'Cloud Run', 'GCP Pub/Sub', 'Cloud Storage']
    }
  ];

  return (
    <section id="architecture" className="py-12 sm:py-16 md:py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent px-2">
            Enterprise Architecture
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground px-4">Built for scale, security, and regulatory adaptability</p>
        </div>

        {/* Architecture Features Grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-12 sm:mb-16">
          {architectureFeatures.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="bg-gradient-to-br from-card/50 to-muted/50 p-4 sm:p-6 rounded-xl border border-border hover:border-primary/50 transition-all group"
              >
                <Icon className="h-10 w-10 sm:h-12 sm:w-12 text-primary mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg sm:text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Microservices Architecture */}
        <div className="mb-12 sm:mb-16">
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Purpose-Built Microservices</h3>
            <p className="text-sm sm:text-base text-muted-foreground px-4">
              Each service scales independently with its own database, enabling superior performance and security
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {microservices.map((service, i) => {
              const Icon = service.icon;
              const styles = colorStyles[service.color as keyof typeof colorStyles] || colorStyles.primary;
              return (
                <div
                  key={i}
                  className={`bg-gradient-to-br from-card/50 to-muted/50 p-4 sm:p-6 rounded-xl border transition-all group ${styles.border}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${styles.text}`} />
                    <h4 className="text-base sm:text-lg font-bold">{service.name}</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{service.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="bg-gradient-to-r from-card/80 to-muted/80 p-6 sm:p-8 rounded-2xl border border-primary/20">
          <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">Modern Technology Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {techStack.map((stack, i) => (
              <div key={i}>
                <h4 className="font-semibold text-primary mb-2 text-sm sm:text-base">{stack.category}</h4>
                <ul className="space-y-1">
                  {stack.techs.map((tech, j) => (
                    <li key={j} className="text-xs sm:text-sm text-muted-foreground">
                      {tech}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
