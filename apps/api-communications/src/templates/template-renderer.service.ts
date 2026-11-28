import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { ITemplateRenderContext } from '@verichron/contracts';
import { TemplateRenderFailedException } from './errors/template-render-failed.exception';

/**
 * Template Renderer Service
 *
 * Handles Handlebars template compilation and rendering with custom helpers
 * - Compiles and renders templates with dynamic context
 * - Provides currency, date, and debt status formatting helpers
 * - Validates template syntax
 */
@Injectable()
export class TemplateRendererService {
  private readonly logger = new Logger(TemplateRendererService.name);
  private handlebars: typeof Handlebars;

  constructor() {
    this.handlebars = Handlebars.create();
    this.registerHelpers();
    this.logger.log('Handlebars template renderer initialized with custom helpers');
  }

  /**
   * Render a template with provided context
   */
  render(templateContent: string, context: ITemplateRenderContext): string {
    try {
      const template = this.handlebars.compile(templateContent);
      const rendered = template(context);

      this.logger.debug(`Successfully rendered template (${templateContent.length} chars → ${rendered.length} chars)`);

      return rendered;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Template rendering failed: ${errorMessage}`);

      throw new TemplateRenderFailedException(
        `Template rendering failed: ${errorMessage}`
      );
    }
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers(): void {
    // Currency formatting
    this.handlebars.registerHelper('currency', (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    });

    // Date formatting
    this.handlebars.registerHelper('formatDate', (date: string | Date, format?: string) => {
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString('en-US');
      }
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    });

    // Conditional helper for debt status
    this.handlebars.registerHelper('debtStatus', (status: string) => {
      const statusMap: Record<string, string> = {
        ACTIVE: 'Active',
        PAID: 'Paid in Full',
        SETTLED: 'Settled',
        DISPUTED: 'Under Dispute',
      };
      return statusMap[status] || status;
    });
  }

  /**
   * Validate template syntax without rendering
   */
  validateTemplate(templateContent: string): { valid: boolean; error?: string } {
    try {
      this.handlebars.compile(templateContent);
      return { valid: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { valid: false, error: errorMessage };
    }
  }
}

// Example template usage:
/*
Subject: Payment Receipt - {{debt.accountNumber}}

Dear {{debtor.firstName}} {{debtor.lastName}},

Thank you for your payment of {{currency payment.amount}} on {{formatDate payment.date}}.

Account Details:
- Account Number: {{debt.accountNumber}}
- Original Amount: {{currency debt.originalAmount}}
- Remaining Balance: {{currency debt.currentBalance}}

Transaction ID: {{payment.transactionId}}

If you have questions, contact us at {{organization.phone}}.

Best regards,
{{organization.name}}
*/
