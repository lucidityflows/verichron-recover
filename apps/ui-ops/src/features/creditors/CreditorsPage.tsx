import { useState } from 'react';
import { 
  Scale, 
  Edit2, 
  Building2, 
  Hash,
  CheckCircle2,
  AlertCircle,
  Plus,
  Tag
} from 'lucide-react';
import { Card } from '../../shared/components/Card.js';
import { FilterBar } from '../../shared/components/FilterBar.js';
import { Badge } from '../../shared/components/Badge.js';
import { VirtualTable, Column } from '../../shared/components/VirtualTable.js';
import { Button } from '../../shared/components/Button.js';
import { useCreditorsOpsControllerFindAllGlobal } from '../../api/generated/debts/endpoints/ops-creditors/ops-creditors.js';
import { GlobalCreditorResponseDto } from '../../api/generated/debts_models/index.js';
import { GlobalCreditorModal } from './components/GlobalCreditorModal.js';

export function CreditorsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCreditor, setSelectedCreditor] = useState<GlobalCreditorResponseDto | null>(null);

  const { data: response, isLoading } = useCreditorsOpsControllerFindAllGlobal();

  const creditors = response?.data || [];

  const filteredCreditors = creditors.filter((c) => 
    c.canonicalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (typeof c.verifiedEIN === 'string' ? c.verifiedEIN : '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (creditor: GlobalCreditorResponseDto) => {
    setSelectedCreditor(creditor);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedCreditor(null);
    setIsModalOpen(true);
  };

  const columns: Column<GlobalCreditorResponseDto>[] = [
    {
      key: 'canonicalName',
      header: 'Master Creditor Name',
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-muted)] flex items-center justify-center text-[var(--color-foreground)] border border-[var(--color-border)]">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">{c.canonicalName}</p>
            {c.knownAliases && c.knownAliases.length > 0 && (
              <p className="text-[10px] text-[var(--color-muted-foreground)] font-medium truncate max-w-[200px]">
                {c.knownAliases.join(', ')}
              </p>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'verifiedEIN',
      header: 'EIN / Tax ID',
      width: 150,
      render: (c) => (
        <div className="flex items-center gap-2 text-[var(--color-muted-foreground)] font-mono text-[11px] font-bold">
          <Hash className="w-3 h-3 opacity-50" />
          {c.verifiedEIN || 'NOT VERIFIED'}
        </div>
      )
    },
    {
      key: 'industry',
      header: 'Industry',
      width: 150,
      render: (c) => (
        <div className="flex items-center gap-2 text-[var(--color-muted-foreground)] text-[11px] font-black uppercase tracking-tight">
          <Tag className="w-3 h-3 opacity-50" />
          {String(c.industry || 'Unknown')}
        </div>
      )
    },
    {
      key: 'isReferenceOnly',
      header: 'Mastery',
      width: 140,
      render: (c) => (
        <div className="flex items-center gap-1.5">
          {c.isReferenceOnly ? (
            <Badge variant="success" size="sm" icon={<CheckCircle2 className="w-3 h-3" />}>
              Gold List
            </Badge>
          ) : (
            <Badge variant="info" size="sm" icon={<AlertCircle className="w-3 h-3" />}>
              Learned
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: '',
      width: 80,
      className: 'justify-end',
      render: (c) => (
        <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Master Creditor Registry
            </h1>
            <p className="text-[10px] text-[var(--color-muted-foreground)] font-black uppercase tracking-widest mt-1">Global Data Mastery (MDM)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Export Master</Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={handleAdd}>
            Add Global Entry
          </Button>
        </div>
      </div>

      <Card variant="default" className="h-[calc(100vh-250px)] flex flex-col p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by Name, EIN, or ID..."
          />
        </div>

        <VirtualTable
          data={filteredCreditors}
          columns={columns}
          isLoading={isLoading}
          getRowKey={(item) => item.id}
          className="border-0 rounded-none flex-1"
          height="100%"
          emptyState={{
            icon: Scale,
            title: 'No master creditors found',
            description: 'The global gold-list is currently empty or no results match your search.'
          }}
        />
      </Card>

      <GlobalCreditorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        creditor={selectedCreditor}
      />
    </div>
  );
}