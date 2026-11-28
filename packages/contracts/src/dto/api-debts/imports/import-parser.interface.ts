import { IPortfolioImportData } from './import-data.interface';

/**
 * Contract interface for portfolio import parsers.
 *
 * All parsers (CSV, AI, Excel, PDF, etc.) must implement this interface
 * to ensure consistent behavior and allow swapping parsers transparently.
 *
 * The parser abstraction allows:
 * - Adding new file formats without changing business logic
 * - A/B testing different parsing strategies
 * - Supporting multiple formats simultaneously
 * - Easy AI enhancement without refactoring
 */
export interface IImportParser {
  /**
   * Parser identifier for logging and telemetry
   */
  readonly name: string;

  /**
   * File extensions this parser supports (including dot)
   * Example: ['.csv', '.txt']
   */
  readonly supportedExtensions: string[];

  /**
   * Parse file content and return normalized portfolio data.
   *
   * This method must:
   * 1. Parse the file content
   * 2. Validate required fields
   * 3. Normalize data to IPortfolioImportData structure
   * 4. Throw descriptive errors for invalid data
   *
   * @param fileContent - Raw file buffer
   * @param filename - Original filename (for context/metadata)
   * @param options - Optional parsing configuration (e.g. column mapping)
   * @returns Normalized portfolio data ready for import
   * @throws Error with user-friendly message if parsing fails
   */
  parse(fileContent: Buffer, filename: string, options?: { columnMapping?: Record<string, string> }): Promise<IPortfolioImportData>;

  /**
   * Inspect file and return headers and first few rows for mapping.
   */
  inspect(fileContent: Buffer, filename: string): Promise<{ headers: string[], previewRows: any[] }>;
}
