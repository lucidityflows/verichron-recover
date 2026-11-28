import { X, FileText, Download, ShieldCheck, HelpCircle, Upload, AlertTriangle } from 'lucide-react';

interface ValidationVaultProps {
  debtId: string;
  creditor: string;
  onClose: () => void;
}

export function ValidationVault({ creditor, onClose }: ValidationVaultProps) {
  const documents = [
    { id: '1', name: 'Original Invoice #8821', type: 'PDF', date: 'Oct 12, 2025', size: '1.2 MB' },
    { id: '2', name: 'Debt Validation Notice', type: 'PDF', date: 'Dec 05, 2025', size: '450 KB' },
    { id: '3', name: 'Signed Service Agreement', type: 'PDF', date: 'Sep 20, 2024', size: '2.4 MB' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden animate-zoom-in">
        <div className="absolute top-6 right-6 z-20">
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-8 sm:p-12 space-y-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-6 w-6" />
              <h2 className="text-2xl font-bold tracking-tight">Validation Vault</h2>
            </div>
            <p className="text-muted-foreground">Transparency is our priority. View all original documents associated with your {creditor} account.</p>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Available Documents</h4>
            <div className="grid grid-cols-1 gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="group flex items-center justify-between p-4 rounded-2xl border border-border/50 hover:bg-muted/50 transition-all cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.date} • {doc.size}</p>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors">
                    <Download className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="p-5 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Upload className="h-4 w-4 text-primary" />
                Upload Evidence
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">Have proof of payment or financial hardship? Securely upload documents for review.</p>
              <button className="text-xs font-bold text-primary hover:underline uppercase tracking-tighter">Start Upload</button>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50/30 border border-amber-100/50 space-y-3 text-amber-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Dispute This Account
              </div>
              <p className="text-xs text-amber-800/70 leading-relaxed">Think something is incorrect? File a formal dispute in seconds. No letters required.</p>
              <button className="text-xs font-bold text-amber-600 hover:underline uppercase tracking-tighter">File Dispute</button>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span>Need help understanding these documents? <button className="text-primary hover:underline font-medium">Chat with AI Assistant</button></span>
          </div>
        </div>
      </div>
    </div>
  );
}
