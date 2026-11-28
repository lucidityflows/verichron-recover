import { scrollToSection } from '../../utils/scrollTo.js';
import verichronLogo from '../../assets/verichron-logo.svg';

export const Footer = () => {
  return (
    <footer className="py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img 
                src={verichronLogo} 
                alt="Verichron Inc." 
                className="h-10 w-auto object-contain" 
              />
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Innovating debt management, Verichron Inc. is building a comprehensive platform for the modern enterprise, currently seeking alpha partners for Q1 2026.
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Verichron Inc.</p>
              <p>5900 Balcones Drive, Suite 100</p>
              <p>Austin, TX 78731</p>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="font-semibold mb-4 text-secondary">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button
                  onClick={() => scrollToSection('platform')}
                  className="hover:text-secondary transition-colors cursor-pointer"
                >
                  Verichron Recover
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('features')}
                  className="hover:text-secondary transition-colors cursor-pointer"
                >
                  Multi-User Features
                </button>
              </li>
              <li>
                <span className="text-muted-foreground/50 flex items-center gap-2">
                  Live Demo 
                  <span className="text-[10px] bg-muted px-1 rounded border border-border">Coming Soon</span>
                </span>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('alpha')}
                  className="hover:text-secondary transition-colors cursor-pointer"
                >
                  Alpha Program
                </button>
              </li>
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-semibold mb-4 text-primary">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button
                  onClick={() => scrollToSection('about')}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  About
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('architecture')}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  Technology
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollToSection('contact')}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  Strategic Partnerships
                </button>
              </li>
            </ul>
          </div>

          {/* Connect Links */}
          <div>
            <h4 className="font-semibold mb-4 text-secondary">Connect</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <button
                  onClick={() => scrollToSection('contact')}
                  className="hover:text-secondary transition-colors cursor-pointer"
                >
                  Contact
                </button>
              </li>
              <li>
                <a
                  href="mailto:info@verichroninc.com"
                  className="hover:text-secondary transition-colors hover:underline"
                >
                  Email Us
                </a>
              </li>
              <li>
                <a
                  href="mailto:robert.torres@verichroninc.com"
                  className="hover:text-secondary transition-colors hover:underline"
                >
                  Founder
                </a>
              </li>
              <li>
                <a
                  href="tel:+15125531391"
                  className="hover:text-secondary transition-colors hover:underline"
                >
                  (512) 553-1391
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © 2026 Verichron Inc. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="text-muted-foreground hover:text-secondary transition-colors text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-muted-foreground hover:text-secondary transition-colors text-sm">
              Terms of Service
            </a>
            <a href="#" className="text-muted-foreground hover:text-secondary transition-colors text-sm">
              Security
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
