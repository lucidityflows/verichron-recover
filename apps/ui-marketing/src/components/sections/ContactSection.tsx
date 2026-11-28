import { Mail, Users, Eye, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { emailConfig, isEmailConfigured } from '../../config/email.js';

export const ContactSection = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!subject) {
      alert('Please select a subject.');
      return;
    }

    // Check if EmailJS is configured
    if (!isEmailConfigured()) {
      console.error('EmailJS is not configured. Missing VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, or VITE_EMAILJS_PUBLIC_KEY.');
      setStatus('error');
      alert('Email service is not configured. Please check environment variables.');
      return;
    }

    setStatus('sending');

    try {
      // Send email to the person who filled out the form (Visitor)
      // Note: Ensure your EmailJS template uses {{to_email}} in the "To Email" field
      const response = await emailjs.send(
        emailConfig.serviceId,
        emailConfig.templateId,
        {
          from_name: 'Verichron Team', // Sender Name appearing in their inbox
          from_email: 'info@verichroninc.com',
          reply_to: 'info@verichroninc.com', // If they reply, it goes to Admin
          to_email: email, // <--- SEND TO THE FORM INPUT EMAIL
          to_name: name,
          subject: subject,
          message: message,
        },
        emailConfig.publicKey
      );

      console.log(`Email successfully sent to ${email}`, response);

      // Optional: You might want a separate notification to yourself (Admin) here
      // But for now, we are fixing the primary requested behavior.

      setStatus('success');

      // Clear form
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (error: any) {
      console.error('Failed to send email:', error);
      setStatus('error');
    }
  };
  
  return (
    <section id="contact" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Get in Touch
          </h2>
          <p className="text-xl text-muted-foreground">Ready to transform debt collection management?</p>
        </div>

        {/* Contact Methods */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">General Inquiries</h3>
            <a
              href="mailto:info@verichroninc.com"
              className="text-primary hover:text-primary/80 transition-colors hover:underline block"
            >
              info@verichroninc.com
            </a>
            <p className="text-muted-foreground text-sm mt-1">Partnerships and general questions</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Founder</h3>
            <a
              href="mailto:robert.torres@verichroninc.com"
              className="text-secondary hover:text-secondary/80 transition-colors hover:underline block"
            >
              robert.torres@verichroninc.com
            </a>
            <p className="text-muted-foreground text-sm mt-1">Strategic Partnerships</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Eye className="h-8 w-8 text-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Platform Demo</h3>
            <div className="text-primary font-medium">
              Coming Soon
            </div>
            <p className="text-muted-foreground text-sm mt-1">Live demonstration available Late Jan 2026</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="h-8 w-8 text-foreground flex items-center justify-center font-bold text-lg">HQ</div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Office</h3>
            <div className="text-muted-foreground text-sm">
              <p>5900 Balcones Drive, Suite 100</p>
              <p>Austin, TX 78731</p>
              <a href="tel:+15125531391" className="text-primary hover:underline mt-1 block">(512) 553-1391</a>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-gradient-to-r from-card/80 to-muted/80 p-8 rounded-2xl border border-primary/20">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-center">Send Us a Message</h3>
            <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-card/50 border border-border rounded-lg focus:border-primary focus:outline-none transition-colors text-foreground"
                    placeholder="Your Name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-card/50 border border-border rounded-lg focus:border-primary focus:outline-none transition-colors text-foreground"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Subject</label>
                <div className="relative">
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 pr-10 py-3 bg-card border border-border rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all text-foreground appearance-none cursor-pointer"
                    style={{ colorScheme: 'dark' }}
                    required
                  >
                    <option value="" disabled className="bg-card text-muted-foreground">Select Subject</option>
                    <option className="bg-card text-foreground">Alpha Program Interest</option>
                    <option className="bg-card text-foreground">Strategic Partnership Inquiry</option>
                    <option className="bg-card text-foreground">Partnership Inquiry</option>
                    <option className="bg-card text-foreground">Engineering Positions</option>
                    <option className="bg-card text-foreground">Platform Demo Request</option>
                    <option className="bg-card text-foreground">General Questions</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Message</label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-card/50 border border-border rounded-lg focus:border-primary focus:outline-none transition-colors text-foreground"
                  placeholder="Tell us about your interest in Verichron..."
                  required
                />
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="px-8 py-3 bg-gradient-to-r from-primary to-secondary rounded-lg font-semibold hover:from-primary/90 hover:to-secondary/90 transition-all transform hover:scale-105 shadow-lg hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'sending' ? 'Sending...' : 'Send Message'}
                </button>
                {status === 'success' && <p className="mt-4 text-sm text-green-500">Thank you! Your message has been sent.</p>}
                {status === 'error' && <p className="mt-4 text-sm text-red-500">Something went wrong. Please try again later.</p>}
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};
