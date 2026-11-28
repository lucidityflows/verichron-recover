import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';

/**
 * TemplateFactory
 *
 * Factory for creating communication Template entities.
 * Supports creating email, SMS, and letter templates with Handlebars syntax.
 */

export type TemplateType = 'EMAIL' | 'SMS' | 'LETTER';

export interface CreateTemplateOptions {
  organizationId: string;
  name: string;
  displayName?: string;
  type: TemplateType;
  subject?: string;
  body?: string;
  version?: number;
  isActive?: boolean;
  description?: string;
  requiredVariables?: string[];
  metadata?: Record<string, any>;
  createdBy?: string;
}

export interface Template {
  id: string;
  organizationId: string;
  name: string;
  displayName: string;
  type: TemplateType;
  subject?: string;
  body: string;
  version: number;
  isActive: boolean;
  description?: string;
  requiredVariables?: string[];
  metadata?: Record<string, any>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class TemplateFactory {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Create a communication template
   *
   * @example
   * ```typescript
   * const template = await templateFactory.createTemplate({
   *   organizationId: org.id,
   *   name: 'payment-receipt',
   *   displayName: 'Payment Receipt Email',
   *   type: 'EMAIL',
   *   subject: 'Payment Receipt - {{amount}}',
   *   body: '<p>Thank you for your payment of {{amount}}.</p>',
   * });
   * ```
   */
  async createTemplate(options: CreateTemplateOptions): Promise<Template> {
    const displayName = options.displayName || options.name.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    const body = options.body || this.getDefaultBody(options.type);
    const version = options.version || 1;
    const isActive = options.isActive !== undefined ? options.isActive : true;
    const description = options.description || null;
    const requiredVariables = options.requiredVariables || null;
    const metadata = options.metadata || null;
    const createdBy = options.createdBy || null;

    const result = await this.dataSource.query(
      `
      INSERT INTO templates (
        organization_id,
        name,
        display_name,
        type,
        subject,
        body,
        version,
        is_active,
        description,
        required_variables,
        metadata,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
      `,
      [
        options.organizationId,
        options.name,
        displayName,
        options.type,
        options.subject || null,
        body,
        version,
        isActive,
        description,
        requiredVariables ? JSON.stringify(requiredVariables) : null,
        metadata ? JSON.stringify(metadata) : null,
        createdBy,
      ],
    );

    return this.mapTemplate(result[0]);
  }

  /**
   * Create an email template
   *
   * @example
   * ```typescript
   * const template = await templateFactory.createEmailTemplate({
   *   organizationId: org.id,
   *   name: 'payment-reminder',
   *   subject: 'Payment Due Reminder',
   *   body: '<p>Your payment of {{amount}} is due on {{dueDate}}.</p>',
   * });
   * ```
   */
  async createEmailTemplate(
    options: Omit<CreateTemplateOptions, 'type'> & { subject: string },
  ): Promise<Template> {
    return this.createTemplate({
      ...options,
      type: 'EMAIL',
    });
  }

  /**
   * Create an SMS template
   *
   * @example
   * ```typescript
   * const template = await templateFactory.createSmsTemplate({
   *   organizationId: org.id,
   *   name: 'payment-confirmation',
   *   body: 'Payment of {{amount}} received. Thank you!',
   * });
   * ```
   */
  async createSmsTemplate(options: Omit<CreateTemplateOptions, 'type' | 'subject'>): Promise<Template> {
    return this.createTemplate({
      ...options,
      type: 'SMS',
    });
  }

  /**
   * Create a letter template
   *
   * @example
   * ```typescript
   * const template = await templateFactory.createLetterTemplate({
   *   organizationId: org.id,
   *   name: 'debt-notice',
   *   body: 'Dear {{debtorName}},\n\nThis is to inform you...',
   * });
   * ```
   */
  async createLetterTemplate(options: Omit<CreateTemplateOptions, 'type' | 'subject'>): Promise<Template> {
    return this.createTemplate({
      ...options,
      type: 'LETTER',
    });
  }

  /**
   * Create payment receipt email template
   *
   * @example
   * ```typescript
   * const template = await templateFactory.createPaymentReceiptTemplate(org.id);
   * ```
   */
  async createPaymentReceiptTemplate(organizationId: string): Promise<Template> {
    return this.createEmailTemplate({
      organizationId,
      name: 'payment-receipt',
      displayName: 'Payment Receipt Email',
      subject: 'Payment Receipt - {{amount}}',
      body: `
        <html>
          <body>
            <p>Dear {{debtorName}},</p>
            <p>Thank you for your payment of <strong>{{amount}}</strong> on {{paymentDate}}.</p>
            <p>Transaction ID: {{transactionId}}</p>
            <p>Your current balance is: {{remainingBalance}}</p>
            <p>Thank you for your payment!</p>
          </body>
        </html>
      `,
      requiredVariables: ['debtorName', 'amount', 'paymentDate', 'transactionId', 'remainingBalance'],
      description: 'Sent after successful payment transaction',
      metadata: { category: 'payment', priority: 'high' },
    });
  }

  /**
   * Create payment reminder SMS template
   *
   * @example
   * ```typescript
   * const template = await templateFactory.createPaymentReminderSmsTemplate(org.id);
   * ```
   */
  async createPaymentReminderSmsTemplate(organizationId: string): Promise<Template> {
    return this.createSmsTemplate({
      organizationId,
      name: 'payment-reminder-sms',
      displayName: 'Payment Reminder SMS',
      body: 'REMINDER: Payment of {{amount}} due on {{dueDate}}. Reply STOP to opt out.',
      requiredVariables: ['amount', 'dueDate'],
      description: 'Sent 3 days before payment due date',
      metadata: { category: 'reminder', priority: 'medium' },
    });
  }

  /**
   * Create multiple templates at once
   *
   * @example
   * ```typescript
   * const templates = await templateFactory.createMultipleTemplates({
   *   organizationId: org.id,
   *   count: 3,
   *   type: 'EMAIL',
   * });
   * ```
   */
  async createMultipleTemplates(options: {
    organizationId: string;
    count: number;
    type: TemplateType;
  }): Promise<Template[]> {
    const templates: Template[] = [];

    for (let i = 0; i < options.count; i++) {
      const template = await this.createTemplate({
        organizationId: options.organizationId,
        name: `template-${options.type.toLowerCase()}-${i + 1}`,
        type: options.type,
        subject: options.type === 'EMAIL' ? faker.lorem.sentence() : undefined,
      });
      templates.push(template);
    }

    return templates;
  }

  /**
   * Get default body based on template type
   */
  private getDefaultBody(type: TemplateType): string {
    switch (type) {
      case 'EMAIL':
        return '<p>{{body}}</p>';
      case 'SMS':
        return '{{message}}';
      case 'LETTER':
        return 'Dear {{recipient}},\n\n{{body}}\n\nSincerely,\n{{sender}}';
      default:
        return '';
    }
  }

  /**
   * Maps database result to Template type
   */
  private mapTemplate(row: any): Template {
    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      displayName: row.display_name,
      type: row.type,
      subject: row.subject,
      body: row.body,
      version: row.version,
      isActive: row.is_active,
      description: row.description,
      requiredVariables: row.required_variables,
      metadata: row.metadata,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

/**
 * Factory function to create a TemplateFactory instance
 *
 * @example
 * ```typescript
 * const templateFactory = createTemplateFactory(communicationsDataSource);
 * const template = await templateFactory.createPaymentReceiptTemplate(org.id);
 * ```
 */
export function createTemplateFactory(dataSource: DataSource): TemplateFactory {
  return new TemplateFactory(dataSource);
}
