import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  FlaskConical,
  Send,
  Mail,
  MessageSquare,
  Phone,
  Zap,
  Terminal,
  CreditCard
} from 'lucide-react';
import { Card } from '../../shared/components/Card.js';
import { Button } from '../../shared/components/Button.js';
import { Input } from '../../shared/components/Input.js';
import { Select } from '../../shared/components/Select.js';
import { Badge } from '../../shared/components/Badge.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../shared/utils/errors.js';
import { customInstance } from '../../api/custom-client.js';
import { organizationService } from '../../shared/services/organizationService.js';
import { cn } from '../../shared/utils/cn.js';

type DispatchMethod = 'EMAIL' | 'SMS' | 'LETTER';

export function SandboxPage() {
  const [method, setMethod] = useState<DispatchMethod>('EMAIL');
  const [recipient, setRecipient] = useState('');
  const [templateName, setTemplateName] = useState('RAW');
  const [contextJson, setContextJson] = useState(`{
  "subject": "QA Test",
  "content": "This is a test message from the Sandbox."
}`);
  const [voiceNumber, setVoiceNumber] = useState('');

  // Event Orchestration State
  const [eventOrgId, setEventOrgId] = useState('');
  const [eventType, setEventType] = useState('DEBTS.PORTFOLIO.IMPORT_COMPLETED');
  const [eventPayload, setEventPayload] = useState(`{
  "portfolioId": "00000000-0000-0000-0000-000000000000",
  "totalRecords": 100
}`);

  // 1. Fetch Communications Gateway Status
  const { data: commsStatus } = useQuery({
    queryKey: ['ops-communications-gateways'],
    queryFn: () => customInstance<any>('/ops/communications/gateways/status', { method: 'GET' }),
    refetchInterval: 30000 // Poll every 30s
  });

  // 2. Fetch Transactions Gateway Status
  const { data: transStatus } = useQuery({
    queryKey: ['ops-transactions-gateways'],
    queryFn: () => customInstance<any>('/ops/transactions/gateways/status', { method: 'GET' }),
    refetchInterval: 30000
  });

  // Fetch organizations for event context selection
  const { data: orgsResponse } = useQuery({
    queryKey: ['organizations-list-simple'],
    queryFn: () => organizationService.listOrganizations({ page: 1, pageSize: 100 }),
  });

  // Mutations for Sandbox APIs
  const dispatchMutation = useMutation({
    mutationFn: async (data: any) => {
      return customInstance(`/ops/communications/sandbox/dispatch`, {
        method: 'POST',
        body: JSON.stringify({ ...data, organizationId: 'SYSTEM' }),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data: any) => {
      toast.success('Test Dispatch Successful', {
        description: `Provider ID: ${data.messageId || 'MOCK-ID'}`
      });
    },
    onError: (error) => {
      toast.error('Dispatch Failed', {
        description: getErrorMessage(error)
      });
    }
  });

  const voiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return customInstance(`/ops/voice/sandbox/call`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: (data: any) => {
      if (data.success === false) {
        toast.error('Voice Call Failed', { description: data.error });
      } else {
        toast.success('Voice Call Initiated', {
          description: `Call SID: ${data.sid}`
        });
      }
    },
    onError: (error) => {
      toast.error('Voice Service Error', {
        description: getErrorMessage(error)
      });
    }
  });

  const eventTriggerMutation = useMutation({
    mutationFn: async (data: any) => {
      return customInstance(`/ops/events/trigger`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast.success('Event Injected Successfully', {
        description: 'The event has been published to the system mesh.'
      });
    },
    onError: (error) => {
      toast.error('Injection Failed', {
        description: getErrorMessage(error)
      });
    }
  });

  const handleTriggerEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventOrgId) {
      toast.error('Missing Organization', { description: 'Please select a tenant for this event context.' });
      return;
    }
    try {
      const payload = JSON.parse(eventPayload);
      eventTriggerMutation.mutate({
        eventType,
        organizationId: eventOrgId,
        payload
      });
    } catch (_e) {
      toast.error('Invalid Payload JSON', { description: 'Please check your event data format.' });
    }
  };

  const gatewayStatuses = [
    { 
      name: 'SendGrid', 
      status: commsStatus?.email?.status || 'UNKNOWN', 
      mode: commsStatus?.email?.mode || 'N/A',
      icon: Mail 
    },
    { 
      name: 'Twilio', 
      status: commsStatus?.sms?.status || 'UNKNOWN', 
      mode: commsStatus?.sms?.mode || 'N/A',
      icon: MessageSquare 
    },
    { 
      name: 'Stripe', 
      status: transStatus?.stripe?.status || 'UNKNOWN', 
      mode: transStatus?.stripe?.mode || 'N/A',
      icon: CreditCard 
    },
    { 
      name: 'SoftPhone', 
      status: 'OFFLINE', 
      mode: 'N/A',
      icon: Phone 
    }
  ];

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const context = JSON.parse(contextJson);
      dispatchMutation.mutate({
        method,
        to: recipient,
        templateName,
        context
      });
    } catch (_e) {
      toast.error('Invalid JSON', { description: 'Please check your context data format.' });
    }
  };

  const handleVoiceCall = (e: React.FormEvent) => {
    e.preventDefault();
    voiceMutation.mutate({
      toNumber: voiceNumber,
      message: 'This is a test call from the Verichron QA Sandbox.'
    });
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm">
          <FlaskConical className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            QA Command Terminal
          </h1>
          <p className="text-[10px] text-[var(--color-muted-foreground)] font-black uppercase tracking-widest mt-1">Internal Integration Verification Sandbox</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Communication Tester */}
        <Card
          title="Dispatch Protocols"
          subtitle="Direct injection into communication gateways"
        >
          <form onSubmit={handleDispatch} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Channel Selection</label>
                <div className="flex p-1 bg-[var(--color-muted)] rounded-lg gap-1 border border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => setMethod('EMAIL')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-all text-xs font-bold uppercase",
                      method === 'EMAIL' ? "bg-[var(--color-card)] shadow-sm text-indigo-500 ring-1 ring-[var(--color-border)]" : "text-[var(--color-muted-foreground)] hover:text-foreground"
                    )}
                  >
                    <Mail size={12} />
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('SMS')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md transition-all text-xs font-bold uppercase",
                      method === 'SMS' ? "bg-[var(--color-card)] shadow-sm text-indigo-500 ring-1 ring-[var(--color-border)]" : "text-[var(--color-muted-foreground)] hover:text-foreground"
                    )}
                  >
                    <MessageSquare size={12} />
                    SMS
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Data Context</label>
                <Select
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  options={[
                    { label: 'RAW BUFFER (NO TEMPLATE)', value: 'RAW' },
                    { label: 'USER ACTIVATION FLOW', value: 'USER_INVITATION' },
                    { label: 'TRANSACTION RECEIPT', value: 'PAYMENT_RECEIPT' },
                  ]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">
                {method === 'EMAIL' ? 'Target Address' : 'Target E.164 Number'}
              </label>
              <Input
                placeholder={method === 'EMAIL' ? 'admin@tenant.com' : '+15550000000'}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Payload Configuration</label>
                <Badge variant="outline" size="sm" icon={<Terminal size={8}/>}>JSON</Badge>
              </div>
              <textarea
                className="w-full h-32 bg-[var(--color-muted)]/30 border border-[var(--color-border)] rounded-lg p-4 font-mono text-[11px] text-[var(--color-foreground)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                value={contextJson}
                onChange={(e) => setContextJson(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={dispatchMutation.isPending}
              icon={Send}
            >
              Initiate Raw Dispatch
            </Button>
          </form>
        </Card>

        {/* Voice & Integration Tester */}
        <div className="space-y-6">
          <Card 
            title="Voice Relay"
            subtitle="Outbound call synthesis & relay verification"
          >
            <form onSubmit={handleVoiceCall} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Test Target Number</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="+12125551234"
                    value={voiceNumber}
                    onChange={(e) => setVoiceNumber(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={voiceMutation.isPending}
                    icon={Phone}
                  >
                    Bridge
                  </Button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                <p className="text-[10px] text-indigo-500 font-bold leading-relaxed">
                  NOTE: Sandbox relay uses platform-level TTS (Text-to-Speech) to verify Twilio SIP termination.
                </p>
              </div>
            </form>
          </Card>

          <Card title="Gateway Synchronization" subtitle="Real-time integration health">
            <div className="grid grid-cols-2 gap-3">
              {gatewayStatuses.map((gate) => (
                <div key={gate.name} className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <gate.icon size={14} className={cn(
                      gate.status === 'active' ? 'text-emerald-500' : 
                      gate.status === 'warning' ? 'text-amber-500' : 
                      gate.status === 'UNKNOWN' ? 'text-slate-400' : 'text-red-500'
                    )} />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-foreground">{gate.name}</span>
                      <span className="text-[8px] text-[var(--color-muted-foreground)] font-black uppercase tracking-tighter">{gate.mode}</span>
                    </div>
                  </div>
                  <Badge 
                    variant={
                      gate.status === 'active' ? 'success' : 
                      gate.status === 'warning' ? 'warning' : 
                      gate.status === 'UNKNOWN' ? 'outline' : 'error'
                    } 
                    size="sm"
                  >
                    {gate.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Event Orchestrator Terminal */}
          <Card 
            title="Mesh Injection Terminal" 
            subtitle="Manual event orchestration for support recovery"
          >
            <form onSubmit={handleTriggerEvent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Tenant Context</label>
                  <Select
                    value={eventOrgId}
                    onChange={(e) => setEventOrgId(e.target.value)}
                    placeholder="Select Organization..."
                    options={orgsResponse?.data?.map((org: any) => ({ label: org.name, value: org.id })) || []}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Event Protocol</label>
                  <Select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    options={[
                      { label: 'PORTFOLIO.IMPORT_COMPLETED', value: 'DEBTS.PORTFOLIO.IMPORT_COMPLETED' },
                      { label: 'DEBT.CREATED', value: 'DEBTS.DEBT.CREATED' },
                      { label: 'PAYMENT.RECEIVED', value: 'TRANSACTIONS.PAYMENT.RECEIVED' },
                      { label: 'COMMUNICATION.DELIVERED', value: 'COMMUNICATIONS.COMMUNICATION.DELIVERED' },
                      { label: 'USER.CREATED', value: 'USERS.USER.CREATED' },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)]">Injection Payload</label>
                  <Badge variant="info" size="sm" icon={<Zap size={8}/>}>LIVE MESH</Badge>
                </div>
                <textarea
                  className="w-full h-32 bg-[var(--color-muted)]/30 border border-[var(--color-border)] rounded-lg p-4 font-mono text-[11px] text-[var(--color-foreground)] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                  value={eventPayload}
                  onChange={(e) => setEventPayload(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-700"
                isLoading={eventTriggerMutation.isPending}
                icon={Zap}
              >
                Execute Injection
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}