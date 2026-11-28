import { Link, Outlet } from '@tanstack/react-router';
import { Bell, User } from 'lucide-react';
import verichronLogo from '../../assets/verichron-logo.svg';

export function ConsumerLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Serene Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={verichronLogo} alt="Verichron Recover" className="h-12 w-auto" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <div className="h-8 w-px bg-border/60 mx-1" />
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-muted transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <User className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium hidden md:inline-block">My Profile</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={verichronLogo} alt="Verichron Recover" className="h-10 w-auto" />
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Verichron Inc. Secure & Compliant Debt Resolution.
            </p>
            <div className="flex gap-6">
              <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
              <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">Contact Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
