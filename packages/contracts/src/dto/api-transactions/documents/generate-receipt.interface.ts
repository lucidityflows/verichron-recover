/**
 * Contract interface for generating a payment receipt PDF.
 *
 * The receipt contains transaction details, amount, date, and payment method.
 * Typically auto-generated after successful payment processing.
 */
export interface IGenerateReceipt {
  /**
   * Transaction ID for which to generate the receipt
   */
  transactionId: string;
}
