/**
 * Template Render Context Interface
 *
 * Defines the structure of data passed to Handlebars templates for rendering.
 * Used across all communication types (EMAIL, SMS, LETTER).
 */
export interface ITemplateRenderContext {
  /**
   * Debtor information
   */
  debtor?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  };

  /**
   * Debt information
   */
  debt?: {
    originalAmount: number;
    currentBalance: number;
    accountNumber: string;
    status?: string;
    dueDate?: string;
  };

  /**
   * Payment information
   */
  payment?: {
    amount: number;
    transactionId: string;
    date: string;
    method?: string;
  };

  /**
   * Organization information
   */
  organization?: {
    name: string;
    phone?: string;
    email?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
  };

  /**
   * Collector information
   */
  collector?: {
    name: string;
    phone?: string;
    email?: string;
  };

  /**
   * Additional dynamic properties
   */
  [key: string]: any;
}
