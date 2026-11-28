/**
 * Result of audit chain verification.
 *
 * Used to report the integrity status of an entity's audit trail.
 * @see AUDITS-API-PROPOSAL.md Section A.2.1 for hash chaining strategy
 */
export interface IChainVerificationResult {
  /** Whether the entire chain is valid */
  valid: boolean;
  /** Total number of records in the chain */
  totalRecords: number;
  /** Number of records that passed verification */
  verifiedRecords: number;
  /** Details of any broken links found */
  brokenLinks: IBrokenLink[];
}

/**
 * Details of a broken link in the audit chain.
 *
 * When a chain verification fails, this provides the forensic
 * information needed to identify where tampering may have occurred.
 */
export interface IBrokenLink {
  /** ID of the record with the broken link */
  recordId: string;
  /** Position in the chain (0-indexed) */
  position: number;
  /** Description of the issue */
  issue: string;
  /** What the prevHash should have been */
  expectedHash: string | null;
  /** What the prevHash actually was */
  actualHash: string | null;
}
