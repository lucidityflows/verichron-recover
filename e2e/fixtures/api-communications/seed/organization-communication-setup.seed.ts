import { DataSource } from 'typeorm';
import { createTemplateFactory, createDebtorPreferenceFactory, type Template } from '../factories';

/**
 * Seed: Organization Communication Setup
 *
 * Creates a complete communication setup for an organization including
 * standard templates for emails, SMS, and letters.
 *
 * Scenario Setup:
 * - Payment receipt email template
 * - Payment reminder SMS template
 * - Debt notice letter template
 * - Payment confirmation SMS template
 * - All templates are active and ready to use
 *
 * Expected Test Behavior:
 * - Organization has complete template library
 * - Templates support required variable substitution
 * - Templates are properly categorized and documented
 *
 * @example
 * ```typescript
 * const scenario = await seedOrganizationCommunicationSetup(communicationsDataSource, {
 *   organizationId: org.id,
 * });
 *
 * expect(scenario.emailTemplates.length).toBe(1);
 * expect(scenario.smsTemplates.length).toBe(2);
 * expect(scenario.letterTemplates.length).toBe(1);
 * expect(scenario.allTemplates.length).toBe(4);
 * ```
 */

export interface SeedOrganizationCommunicationSetupOptions {
  organizationId: string;
  createdByUserId?: string;
}

export interface OrganizationCommunicationSetupScenario {
  organizationId: string;
  emailTemplates: Template[];
  smsTemplates: Template[];
  letterTemplates: Template[];
  allTemplates: Template[];
}

export async function seedOrganizationCommunicationSetup(
  dataSource: DataSource,
  options: SeedOrganizationCommunicationSetupOptions,
): Promise<OrganizationCommunicationSetupScenario> {
  const templateFactory = createTemplateFactory(dataSource);

  const emailTemplates: Template[] = [];
  const smsTemplates: Template[] = [];
  const letterTemplates: Template[] = [];

  // Create payment receipt email template
  const paymentReceipt = await templateFactory.createPaymentReceiptTemplate(options.organizationId);
  emailTemplates.push(paymentReceipt);

  // Create payment reminder SMS template
  const paymentReminderSms = await templateFactory.createPaymentReminderSmsTemplate(options.organizationId);
  smsTemplates.push(paymentReminderSms);

  // Create payment confirmation SMS template
  const paymentConfirmationSms = await templateFactory.createSmsTemplate({
    organizationId: options.organizationId,
    name: 'payment-confirmation-sms',
    displayName: 'Payment Confirmation SMS',
    body: 'Payment of {{amount}} received. Thank you! Your new balance is {{remainingBalance}}.',
    requiredVariables: ['amount', 'remainingBalance'],
    description: 'Sent immediately after successful payment',
    metadata: { category: 'confirmation', priority: 'high' },
  });
  smsTemplates.push(paymentConfirmationSms);

  // Create debt notice letter template
  const debtNoticeLetter = await templateFactory.createLetterTemplate({
    organizationId: options.organizationId,
    name: 'debt-notice-letter',
    displayName: 'Debt Collection Notice',
    body: `Dear {{debtorName}},

This letter is to inform you that you have an outstanding debt of {{debtAmount}} with {{organizationName}}.

Original Creditor: {{originalCreditor}}
Debt Amount: {{debtAmount}}
Account Number: {{accountNumber}}
Due Date: {{dueDate}}

Please contact us at {{phoneNumber}} to arrange payment or discuss payment options.

You have the right to dispute this debt within 30 days of receiving this notice.

Sincerely,
{{organizationName}}
Collections Department`,
    requiredVariables: ['debtorName', 'debtAmount', 'organizationName', 'originalCreditor', 'accountNumber', 'dueDate', 'phoneNumber'],
    description: 'Initial debt collection notice sent via postal mail',
    metadata: { category: 'notice', priority: 'high', complianceRequired: true },
  });
  letterTemplates.push(debtNoticeLetter);

  const allTemplates = [...emailTemplates, ...smsTemplates, ...letterTemplates];

  return {
    organizationId: options.organizationId,
    emailTemplates,
    smsTemplates,
    letterTemplates,
    allTemplates,
  };
}
