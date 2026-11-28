/**
 * Import job lifecycle status enumeration
 *
 * Status flow:
 * PENDING → VALIDATING → PROCESSING → COMPLETED
 *                              ↓
 *                           FAILED (with rollback)
 */
export enum ImportJobStatus {
  /**
   * Job created, file uploaded, waiting for processing to begin.
   */
  PENDING = 'PENDING',

  /**
   * File is being parsed and validated.
   * Checking for required fields, data types, duplicates, etc.
   */
  VALIDATING = 'VALIDATING',

  /**
   * Validation passed, creating portfolio and debts in database.
   * All operations within a transaction.
   */
  PROCESSING = 'PROCESSING',

  /**
   * All debts successfully imported, portfolio activated.
   * This is the successful terminal state.
   */
  COMPLETED = 'COMPLETED',

  /**
   * Import failed during validation or processing.
   * Transaction rolled back, no partial imports.
   * Error details stored in errorMessage field.
   */
  FAILED = 'FAILED',
}

