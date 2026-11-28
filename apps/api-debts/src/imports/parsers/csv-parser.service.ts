import { Injectable, Logger } from '@nestjs/common';
import { IImportParser, IPortfolioImportData, IDebtImportData } from '@verichron/contracts';
import { DebtStatus } from '@verichron/enums';
import { addCurrency } from '../../core';
import * as Papa from 'papaparse';

/**
 * CSV Parser for Portfolio Imports (MVP Implementation)
 *
 * This is the production-ready MVP parser for alpha customers.
 * Handles standard CSV files with debt portfolio data.
 *
 * **Supported Format:**
 * CSV with headers (first row) and data rows.
 *
 * **Required Columns:**
 * - Account Number
 * - Creditor Name
 * - Principal Amount
 * - Debt Date
 * - First Name
 * - Last Name
 *
 * **Optional Columns:**
 * - Interest Amount
 * - Fees
 * - Email
 * - Phone
 * - Address, City, State, Zip
 * - Notes
 *
 * **Validation:**
 * - Account numbers must be unique within file
 * - Amounts must be positive numbers
 * - Dates must be valid ISO 8601 or MM/DD/YYYY format
 * - Required fields cannot be empty
 *
 * **Error Handling:**
 * - Throws descriptive errors with row numbers
 * - Fails fast on first error (all-or-nothing)
 */
@Injectable()
export class CsvParserService implements IImportParser {
  private readonly logger = new Logger(CsvParserService.name);

  readonly name = 'csv-parser';
  readonly supportedExtensions = ['.csv', '.txt'];

  /**
   * Parse CSV file into normalized portfolio import data.
   */
  async parse(
    fileContent: Buffer, 
    filename: string, 
    options?: { columnMapping?: Record<string, string> }
  ): Promise<IPortfolioImportData> {
    this.logger.log(`Parsing CSV file: ${filename}`, {
      fileSize: fileContent.length,
      hasCustomMapping: !!options?.columnMapping,
    });

    const csvText = fileContent.toString('utf-8');

    // Parse CSV using papaparse
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing failed: ${parseResult.errors[0].message}`);
    }

    const rows = parseResult.data as Record<string, string>[];

    if (rows.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Validate required columns exist (either directly or via mapping)
    this.validateHeaders(rows[0], options?.columnMapping);

    // Parse debts from rows
    const debts: IDebtImportData[] = [];
    const accountNumbers = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because: 0-indexed + header row

      try {
        const debtData = this.parseDebtRow(row, rowNumber, accountNumbers, options?.columnMapping);
        debts.push(debtData);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Row ${rowNumber}: ${message}`);
      }
    }

    this.logger.log(`Successfully parsed ${debts.length} debts from CSV`, {
      filename,
      debtCount: debts.length,
    });

    // Calculate portfolio metrics using safe arithmetic
    const principalAmounts = debts.map((d) => d.principalAmount);
    const totalPrincipal = addCurrency(...principalAmounts);

    return {
      portfolioName: `Import from ${filename}`,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: parseFloat(totalPrincipal), // Convert to number for DTO
      source: `CSV Import: ${filename}`,
      debts,
      metadata: {
        fileName: filename,
        fileSize: fileContent.length,
        parseMethod: 'csv',
        parsedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Inspect CSV file and return headers and first few rows for mapping.
   */
  async inspect(fileContent: Buffer, filename: string): Promise<{ headers: string[], previewRows: any[] }> {
    this.logger.log(`Inspecting CSV file: ${filename}`);
    const csvText = fileContent.toString('utf-8');
    
    const parseResult = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      preview: 5,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
      throw new Error(`CSV inspection failed: ${parseResult.errors[0].message}`);
    }

    return {
      headers: parseResult.meta.fields || [],
      previewRows: parseResult.data as any[],
    };
  }

  /**
   * Validate that required columns exist in CSV.
   */
  private validateHeaders(firstRow: Record<string, string>, mapping?: Record<string, string>): void {
    const requiredFields = [
      'accountNumber',
      'originalCreditorName',
      'principalAmount',
      'originalDebtDate',
      'debtorFirstName',
      'debtorLastName',
    ];

    const headers = Object.keys(firstRow);
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      // Check if field is mapped
      const mappedHeader = mapping ? Object.keys(mapping).find(h => mapping[h] === field) : null;
      
      if (mappedHeader) {
        if (!headers.includes(mappedHeader)) {
          missingFields.push(`${field} (mapped to "${mappedHeader}")`);
        }
      } else {
        // Fallback to human-readable defaults
        const defaultHeaders: Record<string, string> = {
          accountNumber: 'Account Number',
          originalCreditorName: 'Creditor Name',
          principalAmount: 'Principal Amount',
          originalDebtDate: 'Debt Date',
          debtorFirstName: 'First Name',
          debtorLastName: 'Last Name'
        };
        
        const defaultHeader = defaultHeaders[field];
        if (!headers.includes(defaultHeader)) {
          missingFields.push(`${field} (expected "${defaultHeader}")`);
        }
      }
    }

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required data: ${missingFields.join(', ')}. ` +
        `CSV Headers found: ${headers.join(', ')}`,
      );
    }
  }

  /**
   * Parse a single debt row from CSV.
   */
  private parseDebtRow(
    row: Record<string, string>,
    rowNumber: number,
    accountNumbers: Set<string>,
    mapping?: Record<string, string>,
  ): IDebtImportData {
    // Helper to get value based on mapping or default
    const getValue = (fieldName: string, defaultHeader: string): string | undefined => {
      const header = mapping ? Object.keys(mapping).find(h => mapping[h] === fieldName) : defaultHeader;
      return header ? row[header]?.trim() : undefined;
    };

    // Account Number (required, unique)
    const accountNumber = getValue('accountNumber', 'Account Number');
    if (!accountNumber) throw new Error('accountNumber is required');
    if (accountNumbers.has(accountNumber)) {
      throw new Error(`Duplicate account number: ${accountNumber}`);
    }
    accountNumbers.add(accountNumber);

    // Creditor Name (required)
    const originalCreditorName = getValue('originalCreditorName', 'Creditor Name');
    if (!originalCreditorName) throw new Error('originalCreditorName is required');

    // Principal Amount (required, positive number)
    const principalAmountStr = getValue('principalAmount', 'Principal Amount');
    const principalAmount = this.parseAmount(principalAmountStr, 'Principal Amount', rowNumber, true)!;

    // Interest Amount (optional)
    const interestAmountStr = getValue('interestAmount', 'Interest Amount');
    const interestAmount = this.parseAmount(interestAmountStr, 'Interest Amount', rowNumber, false) || 0;

    // Fees (optional)
    const feesAmountStr = getValue('feesAmount', 'Fees');
    const feesAmount = this.parseAmount(feesAmountStr, 'Fees', rowNumber, false) || 0;

    // Debt Date (required)
    const originalDebtDateStr = getValue('originalDebtDate', 'Debt Date');
    const originalDebtDate = this.parseDate(originalDebtDateStr, rowNumber);

    // Debtor Info (required)
    const debtorFirstName = getValue('debtorFirstName', 'First Name');
    const debtorLastName = getValue('debtorLastName', 'Last Name');
    if (!debtorFirstName || !debtorLastName) throw new Error('debtorFirstName and debtorLastName are required');

    // Optional fields
    const debtorEmail = getValue('debtorEmail', 'Email');
    const debtorPhone = getValue('debtorPhone', 'Phone');
    const debtorAddressLine1 = getValue('debtorAddressLine1', 'Address');
    const debtorAddressLine2 = getValue('debtorAddressLine2', 'Address Line 2');
    const debtorCity = getValue('debtorCity', 'City');
    const debtorState = getValue('debtorState', 'State');
    const debtorZipCode = getValue('debtorZipCode', 'Zip');
    const notes = getValue('notes', 'Notes');

    return {
      accountNumber,
      originalCreditorName,
      principalAmount,
      interestAmount,
      feesAmount,
      originalDebtDate,
      status: DebtStatus.IMPORTED, // All imports start as IMPORTED
      debtorFirstName,
      debtorLastName,
      debtorEmail,
      debtorPhone,
      debtorAddressLine1,
      debtorAddressLine2,
      debtorCity,
      debtorState,
      debtorZipCode,
      notes,
    };
  }

  /**
   * Get required field value with validation.
   */
  private getRequiredField(row: Record<string, string>, fieldName: string, rowNumber: number): string {
    const value = row[fieldName]?.trim();
    if (!value) {
      throw new Error(`${fieldName} is required`);
    }
    return value;
  }

  /**
   * Parse amount field (dollars).
   */
  private parseAmount(
    value: string | undefined,
    fieldName: string,
    rowNumber: number,
    required: boolean,
  ): number | undefined {
    if (!value || value.trim() === '') {
      if (required) {
        throw new Error(`${fieldName} is required`);
      }
      return undefined;
    }

    // Remove currency symbols, commas
    const cleaned = value.replace(/[$,]/g, '').trim();
    const amount = parseFloat(cleaned);

    if (isNaN(amount)) {
      throw new Error(`${fieldName} must be a valid number, got: "${value}"`);
    }

    if (amount < 0) {
      throw new Error(`${fieldName} cannot be negative, got: ${amount}`);
    }

    return amount;
  }

  /**
   * Parse date field (supports ISO 8601 and MM/DD/YYYY).
   */
  private parseDate(value: string | undefined, rowNumber: number): string {
    if (!value || value.trim() === '') {
      throw new Error('Debt Date is required');
    }

    const trimmed = value.trim();

    // Try ISO 8601 format first (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    // Try MM/DD/YYYY format
    const mmddyyyyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mmddyyyyMatch) {
      const month = mmddyyyyMatch[1].padStart(2, '0');
      const day = mmddyyyyMatch[2].padStart(2, '0');
      const year = mmddyyyyMatch[3];
      return `${year}-${month}-${day}`;
    }

    throw new Error(
      `Debt Date must be in YYYY-MM-DD or MM/DD/YYYY format, got: "${value}"`,
    );
  }
}
