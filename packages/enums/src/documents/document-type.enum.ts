/**
 * Document Type Enum
 *
 * Defines the types of documents that can be stored in the system.
 * Documents are stored in Google Cloud Storage and linked to entities via Document entity.
 *
 * CATEGORIES:
 * - Payment Documents: Agreements, receipts, invoices, offers
 * - Settlement Documents: Settlement agreements, acceptance letters
 * - Legal/Compliance Documents: Bankruptcy filings, validation notices, cease & desist
 * - Proof Documents: Account statements, proof of debt, payment history
 * - Internal Documents: Call notes, collector reports, audit documents
 *
 * GCP STORAGE METADATA:
 * Documents that cannot be categorized with these types should use:
 * - GCP object metadata field: "category" = custom category name
 * - GCP object metadata field: "description" = document description
 * - Document entity notes field = additional context
 */
export enum DocumentType {
  // ========================================================================
  // PAYMENT DOCUMENTS
  // ========================================================================

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
   * Payment offer letter
   * Formal document offering reduced payment amount
   */
  PAYMENT_OFFER_LETTER = 'PAYMENT_OFFER_LETTER',

  // ========================================================================
  // SETTLEMENT DOCUMENTS
  // ========================================================================

  /**
   * Settlement agreement document
   * Legally binding contract for settling debt at reduced amount
   * Requires debtor signature
   * Linked to: SettlementOffer entity
   */
  SETTLEMENT_AGREEMENT = 'SETTLEMENT_AGREEMENT',

  /**
   * Settlement acceptance letter
   * Confirms debtor acceptance of settlement offer
   * Documents terms and payment schedule
   * Linked to: SettlementOffer entity
   */
  SETTLEMENT_ACCEPTANCE_LETTER = 'SETTLEMENT_ACCEPTANCE_LETTER',

  /**
   * Settlement completion letter
   * Confirms settlement fully paid
   * Releases debtor from remaining balance
   * Sent after final payment received
   */
  SETTLEMENT_COMPLETION_LETTER = 'SETTLEMENT_COMPLETION_LETTER',

  // ========================================================================
  // LEGAL & COMPLIANCE DOCUMENTS
  // ========================================================================

  /**
   * Bankruptcy petition filed with court
   * Chapter 7, 11, or 13 filing documents
   * FDCPA compliance: Collection MUST cease upon receipt
   * Linked to: BankruptcyFiling entity
   */
  BANKRUPTCY_FILING = 'BANKRUPTCY_FILING',

  /**
   * Bankruptcy discharge notice from court
   * Debt legally eliminated
   * Collection permanently prohibited
   * Linked to: BankruptcyFiling entity
   */
  BANKRUPTCY_DISCHARGE = 'BANKRUPTCY_DISCHARGE',

  /**
   * Bankruptcy schedules
   * Lists debts, assets, income, expenses
   * Shows if debt included in bankruptcy
   * Linked to: BankruptcyFiling entity
   */
  BANKRUPTCY_SCHEDULES = 'BANKRUPTCY_SCHEDULES',

  /**
   * Cease and desist letter from debtor
   * Debtor requesting no further contact
   * FDCPA compliance: Collection contact MUST stop
   * Linked to: DebtorProfile entity
   */
  CEASE_AND_DESIST_LETTER = 'CEASE_AND_DESIST_LETTER',

  /**
   * Debt validation notice (required by FDCPA)
   * Sent to debtor within 5 days of first contact
   * Must include debt amount, creditor name, dispute rights
   * Linked to: Debt entity
   */
  VALIDATION_NOTICE = 'VALIDATION_NOTICE',

  /**
   * Debt validation request from debtor
   * Debtor requesting proof of debt
   * Collection must cease until validation provided
   * Linked to: Debt entity
   */
  VALIDATION_REQUEST = 'VALIDATION_REQUEST',

  /**
   * Attorney representation letter
   * Debtor is represented by legal counsel
   * FDCPA compliance: Contact debtor's attorney only
   * Linked to: DebtorProfile entity
   */
  ATTORNEY_REPRESENTATION_LETTER = 'ATTORNEY_REPRESENTATION_LETTER',

  /**
   * Death certificate
   * Proof of debtor's death
   * Collection against estate only
   * Linked to: DebtorProfile entity
   */
  DEATH_CERTIFICATE = 'DEATH_CERTIFICATE',

  // ========================================================================
  // PROOF & VERIFICATION DOCUMENTS
  // ========================================================================

  /**
   * Proof of debt documentation
   * Original creditor agreement, account statements, chain of title
   * Required for validation or litigation
   * Linked to: Debt entity
   */
  PROOF_OF_DEBT = 'PROOF_OF_DEBT',

  /**
   * Original creditor account statement
   * Historical statement from creditor
   * Shows charges, payments, balance history
   * Linked to: Debt entity
   */
  ACCOUNT_STATEMENT = 'ACCOUNT_STATEMENT',

  /**
   * Chain of title documentation
   * Proves ownership of debt through sales/transfers
   * Required for legal standing to collect
   * Linked to: DebtOwnershipHistory entity
   */
  CHAIN_OF_TITLE = 'CHAIN_OF_TITLE',

  /**
   * Signed credit application or contract
   * Original agreement creating the debt
   * Required for legal enforcement
   * Linked to: Debt entity
   */
  ORIGINAL_AGREEMENT = 'ORIGINAL_AGREEMENT',

  // ========================================================================
  // COMMUNICATION & INTERNAL DOCUMENTS
  // ========================================================================

  /**
   * Call recording or transcript
   * Documentation of phone conversation with debtor
   * Compliance: May require consent depending on state
   * Linked to: Communication entity
   */
  CALL_RECORDING = 'CALL_RECORDING',

  /**
   * Email correspondence
   * Email communication with debtor
   * Linked to: Communication entity
   */
  EMAIL_CORRESPONDENCE = 'EMAIL_CORRESPONDENCE',

  /**
   * Collector notes document
   * Internal notes compiled into document
   * Not sent to debtor
   * Linked to: Debt or DebtorProfile entity
   */
  COLLECTOR_NOTES = 'COLLECTOR_NOTES',

  /**
   * Compliance audit document
   * Internal audit trail for regulatory review
   * Not sent to debtor
   * Linked to: Organization entity
   */
  COMPLIANCE_AUDIT = 'COMPLIANCE_AUDIT',

  // ========================================================================
  // OTHER
  // ========================================================================

  /**
   * Miscellaneous document not categorized above
   * Use GCP metadata "category" and "description" fields for classification
   * Store additional context in Document entity notes field
   */
  OTHER = 'OTHER',
}

