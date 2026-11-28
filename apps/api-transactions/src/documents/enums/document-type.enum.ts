/**
 * Document Type Enum
 *
 * Defines the types of payment-related documents that can be generated.
 * Documents are auto-generated PDFs stored in Google Cloud Storage.
 */
export enum DocumentType {
  /**
   * Payment agreement between debtor and organization
   * Contains payment plan terms, schedule, and signature fields
   */
  PAYMENT_AGREEMENT = 'PAYMENT_AGREEMENT',

  /**
   * Receipt for a completed payment transaction
   * Auto-generated after successful payment processing
   */
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',

  /**
   * Invoice for a debt
   * Shows amount due, breakdown, and payment instructions
   */
  INVOICE = 'INVOICE',

  /**
   * Settlement offer letter
   * Formal document offering reduced payment amount
   * Future enhancement
   */
  PAYMENT_OFFER_LETTER = 'PAYMENT_OFFER_LETTER',
}
