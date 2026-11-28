import { useState } from 'react';
import { CheckCircle, Shield, Zap, TrendingUp, ChevronDown } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { emailConfig, isEmailConfigured } from '../../config/email';

export const AlphaProgramSection = () => {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    organization: '',
    role: '',
    useCase: 'Strategic Partnership'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEmailConfigured()) {
      console.error('EmailJS not configured for Alpha Program');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    
    try {
      await emailjs.send(
        emailConfig.serviceId,
        emailConfig.templateId,
        {
          from_name: 'Verichron Alpha Team',
          from_email: 'info@verichroninc.com',
          reply_to: 'info@verichroninc.com',
          to_email: formData.email, // Send to the applicant
          to_name: formData.name,
          subject: `ALPHA PROGRAM: ${formData.useCase}`,
          message: `
Organization: ${formData.organization}
Role: ${formData.role}
Use Case: ${formData.useCase}
Email: ${formData.email}
          `,
        },
        emailConfig.publicKey
      );
      
      setStatus('success');
      setFormData({ name: '', email: '', organization: '', role: '', useCase: 'Strategic Partnership' });
    } catch (error) {
      console.error('Alpha Program submission error:', error);
      setStatus('error');
    }
  };

  return (
    <section id="alpha" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-card/80 to-muted/80 p-12 rounded-3xl border border-primary/30">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Secure Your Competitive Advantage
            </h2>
            <p className="text-xl text-muted-foreground">
              Join the Alpha Program today to deploy <strong>Quiet Power</strong> and <strong>Flow State</strong> workflows in your organization before your competitors do.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              '<strong>Immediate Access:</strong> Deploy the Manager Command Center and Collector Workstation in Q1 2026.',
              '<strong>Shape the Product:</strong> Direct feedback loop with our engineering team.',
              '<strong>Exclusive Pricing:</strong> Locked-in preferential rates for early adopters.',
              '<strong>Migration Concierge:</strong> White-glove data onboarding assistance.',
              '<strong>Training:</strong> Hands-on "Flow State" training for your collectors.',
              '<strong>Community:</strong> Join a network of forward-thinking agency owners.'
            ].map((benefit, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-muted-foreground text-sm" dangerouslySetInnerHTML={{ __html: benefit }}></span>
              </div>
            ))}
          </div>

          {/* Application Form */}
          <form onSubmit={(e) => { void handleSubmit(e); }} className="max-max-2xl mx-auto space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Company/Organization
                </label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full px-4 py-3 bg-card/50 border border-border rounded-lg focus:border-primary focus:outline-none transition-colors text-foreground"
                  placeholder="Your Organization"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Subject / Use Case</label>
                <div className="relative">
                  <select
                    value={formData.useCase}
                    onChange={(e) => setFormData({ ...formData, useCase: e.target.value })}
                    className="w-full px-4 pr-10 py-3 bg-card border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-foreground appearance-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                    required
                  >
                    <option value="" disabled className="bg-card text-muted-foreground">Select Interest</option>
                    <option className="bg-card text-foreground">Strategic Partnership</option>
                    <option className="bg-card text-foreground">Debt Collection Agency Alpha</option>
                    <option className="bg-card text-foreground">Healthcare Provider Alpha</option>
                    <option className="bg-card text-foreground">Financial Institution Alpha</option>
                    <option className="bg-card text-foreground">Technology Partner</option>
                    <option className="bg-card text-foreground">Other</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Contact Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-card/50 border border-border rounded-lg focus:border-primary focus:outline-none transition-colors text-foreground"
                  placeholder="Your Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-card/50 border border-border rounded-lg focus:border-primary focus:outline-none transition-colors text-foreground"
                  placeholder="contact@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Current Role / Focus Area
              </label>
              <textarea
                rows={4}
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-3 bg-card/50 border border-border rounded-lg focus:border-primary focus:outline-none transition-colors text-foreground"
                placeholder="Describe your role and what you hope to achieve with Verichron..."
                required
              />
            </div>

            <div className="text-center">
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="px-8 py-4 bg-gradient-to-r from-primary to-secondary rounded-lg font-semibold hover:from-primary/90 hover:to-secondary/90 transition-all transform hover:scale-105 shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? 'Submitting...' : 'Apply for Alpha Access'}
              </button>
              {status === 'success' && <p className="mt-4 text-sm text-emerald-500">Thank you for your application! We will review it and get back to you shortly.</p>}
              {status === 'error' && <p className="mt-4 text-sm text-red-500">Something went wrong. Please try again later or contact us directly.</p>}
              {status === 'idle' && <p className="mt-4 text-sm text-muted-foreground">Limited alpha partner positions for Q1 2026. Applications are currently being reviewed.</p>}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
