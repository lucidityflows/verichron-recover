/**
 * Contract interface for generating an invoice PDF.
 *
 * The invoice contains debt details, amounts owed, and payment instructions.
 */
export interface IGenerateInvoice {
  /**
   * Debt ID for which to generate the invoice
   */
  debtId: string;
}
