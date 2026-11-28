/**
 * Contract interface for generating a payment agreement PDF.
 *
 * The agreement contains plan terms, debtor information, and signature fields.
 */
export interface IGenerateAgreement {
  /**
   * Payment plan ID for which to generate the agreement
   */
  planId: string;
}
