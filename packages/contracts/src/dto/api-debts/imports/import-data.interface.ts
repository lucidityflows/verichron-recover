/**
 * Contract interface for debt data extracted during portfolio import.
 *
 * This represents a single debt record to be created during import.
 * All parsers (CSV, AI, manual) must normalize to this structure.
 */
export interface IDebtImportData {
  /**
   * Account number from original creditor (must be unique within organization)
   */
  accountNumber: string;

  /**
   * Name of the original creditor
   */
  originalCreditorName: string;

  /**
   * Principal amount (original debt amount)
   */
  principalAmount: number;

  /**
   * Accrued interest amount (optional, defaults to 0)
   */
  interestAmount?: number;

  /**
   * Fees and charges (optional, defaults to 0)
   */
  feesAmount?: number;

  /**
   * Date when original debt was incurred (ISO 8601 date string)
   */
  originalDebtDate: string;

  /**
   * Initial status (optional, defaults to IMPORTED)
   */
  status?: string;

  /**
   * Debtor first name
   */
  debtorFirstName: string;

  /**
   * Debtor last name
   */
  debtorLastName: string;

  /**
   * Debtor email (optional)
   */
  debtorEmail?: string;

  /**
   * Debtor phone number (optional)
   */
  debtorPhone?: string;

  /**
   * Debtor street address line 1 (optional)
   */
  debtorAddressLine1?: string;

  /**
   * Debtor street address line 2 (optional)
   */
  debtorAddressLine2?: string;

  /**
   * Debtor city (optional)
   */
  debtorCity?: string;

  /**
   * Debtor state/province (optional)
   */
  debtorState?: string;

  /**
   * Debtor postal/ZIP code (optional)
   */
  debtorZipCode?: string;

  /**
   * Additional notes about this debt (optional)
   */
  notes?: string;
}

/**
 * Contract interface for complete portfolio import data.
 *
 * This represents all data needed to create a portfolio and its debts.
 * All parsers must produce this normalized structure.
 */
export interface IPortfolioImportData {
  /**
   * Name for the portfolio being imported
   */
  portfolioName: string;

  /**
   * Date when portfolio was acquired (ISO 8601 date string)
   */
  purchaseDate: string;

  /**
   * Amount paid to acquire the portfolio
   */
  purchasePrice: number;

  /**
   * Source/origin of the portfolio
   */
  source: string;

  /**
   * Array of debt records to create
   */
  debts: IDebtImportData[];

  /**
   * Optional metadata about the import
   */
  metadata?: {
    fileName?: string;
    fileSize?: number;
    parseMethod?: string; // 'csv', 'ai', 'manual', etc.
    parsedAt?: string;
  };
}

/**
 * Contract interface for import result/status.
 */
export interface IImportResult {
  /**
   * Whether import succeeded
   */
  success: boolean;

  /**
   * Created portfolio ID (if successful)
   */
  portfolioId?: string;

  /**
   * Number of debts created
   */
  debtsCreated?: number;

  /**
   * Error message (if failed)
   */
  error?: string;

  /**
   * Detailed validation errors (if failed during validation)
   */
  validationErrors?: Array<{
    row?: number;
    field?: string;
    message: string;
  }>;
}
