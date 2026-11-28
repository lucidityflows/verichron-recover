import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customInstance } from '../../../api/custom-client.js';
import { TemplateType } from '../../../api/generated/communications_models/templateType.js';
import { Input } from '../../../shared/components/Input.js';
import { Select } from '../../../shared/components/Select.js';
import { Button } from '../../../shared/components/Button.js';
import { Modal } from '../../../shared/components/Modal.js';
import { toast } from 'sonner';
import { getErrorMessage } from '../../../shared/utils/errors.js';
import { validateField } from '../../../shared/utils/validation.js';
import { cn } from '../../../shared/utils/cn.js';

interface CreateTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const templateTypeOptions = [
  { value: TemplateType.EMAIL, label: 'Email' },
  { value: TemplateType.SMS, label: 'SMS' },
  { value: TemplateType.LETTER, label: 'Letter' },
];

export function CreateTemplateForm({ isOpen, onClose }: CreateTemplateFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    type: TemplateType.EMAIL as TemplateType,
    subject: '',
    body: '',
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      // Create a new communication template for the SYSTEM organization via v1 communications API
      return customInstance(`/v1/communications/templates/orgs/SYSTEM`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
    },
    onSuccess: () => {
      toast.success('Blueprint drafted successfully');
      queryClient.invalidateQueries({ queryKey: ['platform-templates'] });
      handleClose();
    },
    onError: (error) => {
      toast.error('Failed to create blueprint', { description: getErrorMessage(error) });
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    const nameVal = validateField(formData.name, { required: true, minLength: 2 });
    if (!nameVal.isValid) newErrors.name = nameVal.error!;

    const dispVal = validateField(formData.displayName, { required: true, minLength: 2 });
    if (!dispVal.isValid) newErrors.displayName = dispVal.error!;

    const bodyVal = validateField(formData.body, { required: true, minLength: 10 });
    if (!bodyVal.isValid) newErrors.body = bodyVal.error!;

    if (formData.type === TemplateType.EMAIL) {
      const subVal = validateField(formData.subject, { required: true, minLength: 3 });
      if (!subVal.isValid) newErrors.subject = subVal.error!;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...formData,
      subject: formData.type === TemplateType.EMAIL ? formData.subject : undefined,
    };

    createMutation.mutate(payload);
  };

  const handleClose = () => {
    setFormData({
      name: '',
      displayName: '',
      type: TemplateType.EMAIL,
      subject: '',
      body: '',
      description: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Draft Platform Blueprint"
      description="Design a new system-level outreach template for cross-tenant communications."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Internal Identifier"
            placeholder="e.g. maintenance-alert-v1"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            error={errors.name}
            required
          />
          <Input
            label="Blueprint Label"
            placeholder="e.g. Critical Update Notification"
            value={formData.displayName}
            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            error={errors.displayName}
            required
          />
          <Select
            label="Relay Channel"
            options={templateTypeOptions}
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as TemplateType })}
            required
          />
          <Input
            label="Context Description"
            placeholder="Operational purpose..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {formData.type === TemplateType.EMAIL && (
          <Input
            label="Message Subject Line"
            placeholder="Important: Security Update Required"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            error={errors.subject}
            helperText="Supports Handlebars context: {{user.firstName}}"
            required
          />
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-muted-foreground)] ml-1">Composition Buffer</label>
          <textarea
            className={cn(
              "w-full h-48 bg-[var(--color-muted)]/30 border border-[var(--color-border)] rounded-xl p-4 font-mono text-sm text-[var(--color-foreground)] focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none",
              errors.body && "border-[var(--color-error)] focus:ring-[var(--color-error)]/10 focus:border-[var(--color-error)]"
            )}
            placeholder={formData.type === TemplateType.EMAIL ? "<!-- HTML Composition -->" : "Plain text dispatch..."}
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
          />
          {errors.body && <p className="text-[10px] text-[var(--color-error)] font-bold uppercase tracking-tight ml-1">{errors.body}</p>}
          <p className="text-[10px] text-[var(--color-muted-foreground)] font-medium italic ml-1">Utilize Handlebars syntax for dynamic variable injection.</p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--color-border)]">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Discard
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={createMutation.isPending}
          >
            Execute Drafting
          </Button>
        </div>
      </form>
    </Modal>
  );
}